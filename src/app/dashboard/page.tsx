import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ErrorTagChart, { StatusRingChart, TypeDistributionChart } from "./StatsCharts";
import { ReviewChart } from "./ReviewChart";
import { Progress } from "@/components/ui/progress";
import { Trophy, CalendarClock, Headphones, Mic2, Clock } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  UNLEARNT: "未学习",
  INTENSIVE: "精听",
  ANALYSIS: "分析",
  SHADOWING: "Shadowing",
  SPEED_SHADOWING: "倍速 Shadowing",
  PARAPHRASE: "Paraphrase",
  LEARNT: "已学习",
};

// Helper: group items by key and count occurrences
function groupByCount<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// Helper: convert counts record to chart data array
function countsToChartData(counts: Record<string, number>): Array<{ name: string; value: number }> {
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

// Helper: format duration in seconds to human-readable string
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DashboardPage() {
  // 1. TOEFL Countdown (Static, fast)
  const targetDate = new Date("2026-05-10");
  const today = new Date();
  const diffTime = Math.abs(targetDate.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Async Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardContent countdownDays={diffDays} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ countdownDays }: { countdownDays: number }) {
  // Fetch everything in parallel
  const [tracks, tags, totalSentences, studySessions, reviewLogs, allReviewItems] = await Promise.all([
    prisma.track.findMany({
      where: { isArchived: false },
      select: { status: true, trackType: true },
    }),
    prisma.errorTag.findMany({
      include: { _count: { select: { reviewItems: true } } },
    }),
    prisma.reviewItem.count(),
    prisma.studySession.findMany({
      orderBy: { date: 'desc' },
      take: 30 // Last 30 sessions (roughly 10 days if 3 types per day)
    }),
    prisma.reviewLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000, // Get recent reviews
      select: { createdAt: true, reviewItemId: true },
    }),
    prisma.reviewItem.findMany({
      where: { isArchived: false },
      select: { due: true },
    }),
  ]);

  // Process review data for chart
  // 1. Past reviews: count UNIQUE items by date from ReviewLog (not raw log entries, which includes duplicate "Again" clicks)
  const pastReviewsByDateSet: Record<string, Set<string>> = {};
  reviewLogs.forEach(log => {
    const dateKey = log.createdAt.toISOString().split('T')[0];
    if (!pastReviewsByDateSet[dateKey]) {
      pastReviewsByDateSet[dateKey] = new Set();
    }
    pastReviewsByDateSet[dateKey].add(log.reviewItemId);
  });

  // Convert Sets to counts
  const pastReviewsByDate: Record<string, number> = {};
  for (const [date, itemSet] of Object.entries(pastReviewsByDateSet)) {
    pastReviewsByDate[date] = itemSet.size;
  }

  // Get last 14 days of past reviews
  const past14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (13 - i));
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  });

  const pastData = past14Days.map(date => ({
    date,
    count: pastReviewsByDate[date] || 0,
  }));

  // 2. Future reviews: count by due date
  const futureReviewsByDate: Record<string, number> = {};
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split('T')[0];

  const future30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + i);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  });

  allReviewItems.forEach(item => {
    const dueDate = new Date(item.due);
    dueDate.setUTCHours(0, 0, 0, 0);
    const dateKey = dueDate.toISOString().split('T')[0];

    // Count items: past due items go into today, future items go into their respective dates
    if (dueDate < today) {
      // Past due items: count towards today
      futureReviewsByDate[todayKey] = (futureReviewsByDate[todayKey] || 0) + 1;
    } else if (future30Days.includes(dateKey)) {
      // Future items: count towards their due date
      futureReviewsByDate[dateKey] = (futureReviewsByDate[dateKey] || 0) + 1;
    }
  });

  const futureData = future30Days.map(date => ({
    date,
    count: futureReviewsByDate[date] || 0,
  }));

  // Process Study Time
  const totalDurationSeconds = await prisma.studySession.aggregate({
    _sum: { duration: true }
  }).then(res => res._sum.duration || 0);

  const totalHours = totalDurationSeconds / 3600;
  const c1Progress = Math.min((totalHours / 400) * 100, 100);

  // Group sessions by date for display
  const sessionsByDate: Record<string, { total: number; types: Record<string, number> }> = {};
  for (const s of studySessions) {
    const dateKey = s.date.toISOString().split('T')[0];
    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = { total: 0, types: {} };
    }
    sessionsByDate[dateKey].total += s.duration;
    sessionsByDate[dateKey].types[s.type] = (sessionsByDate[dateKey].types[s.type] || 0) + s.duration;
  }

  const dailyStats = Object.entries(sessionsByDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7); // Last 7 days

  const totalTracks = tracks.length;
  const learntCount = tracks.filter(t => t.status === "LEARNT").length;
  const progressPercent = Math.min(Math.round((learntCount / 100) * 100), 100);

  // Group by Status
  const statusCounts = groupByCount(tracks, t => STATUS_LABELS[t.status] || t.status);
  const statusData = countsToChartData(statusCounts);

  // Group by Type (sorted by count desc)
  const typeCounts = groupByCount(tracks, t => t.trackType || "Uncategorized");
  const typeData = countsToChartData(typeCounts).sort((a, b) => b.value - a.value);

  const tagData = tags.map(t => ({ name: t.name, value: t._count.reviewItems }));

  return (
    <div className="space-y-6 w-full">
      {/* First Row: Countdown + Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TOEFL Countdown Card */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-indigo-100 font-medium text-lg">
              <CalendarClock className="h-5 w-5" /> TOEFL Countdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{countdownDays}</span>
              <span className="text-xl text-indigo-100">days left</span>
            </div>
            <div className="text-sm text-indigo-200 mt-2">Target Date: May 10, 2026</div>
          </CardContent>
        </Card>

        {/* TOEFL 5.0 Progress Card */}
        <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Trophy className="h-5 w-5 text-yellow-500" /> TOEFL 5.0 Progress
          </CardTitle>
          <CardDescription>Target: 100 Learnt Tracks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm font-medium">
            <span>{learntCount} / 100 Tracks</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 bg-indigo-100" />
          <div className="text-xs text-muted-foreground">
            "已学习" (Learnt) counts towards this goal.
          </div>
        </CardContent>
      </Card>

        {/* C1 Fluency Journey Card */}
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <Clock className="h-5 w-5 text-blue-500" /> C1 Fluency Journey
            </CardTitle>
            <CardDescription>Target: 400 Hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>{totalHours.toFixed(1)} / 400 Hours</span>
              <span>{c1Progress.toFixed(1)}%</span>
            </div>
            <Progress value={c1Progress} className="h-3 bg-blue-100" />
            <div className="text-xs text-muted-foreground">
              Tracks Listening, Shadowing & Review time.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Three Chart Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Learning Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] min-w-0">
             {statusData.length > 0 ? (
                <StatusRingChart data={statusData} />
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
             )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card className="min-w-0">
          <CardHeader>
             <CardTitle className="text-base">Content Types</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] min-w-0">
             {typeData.length > 0 ? (
                <TypeDistributionChart data={typeData} />
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
             )}
          </CardContent>
        </Card>

        {/* Error Attribution */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Error Attribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] min-w-0">
            {tagData.length > 0 ? (
              <ErrorTagChart data={tagData} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No error tags logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Review Statistics Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Review Statistics</span>
            <div className="flex items-center gap-4 text-sm font-normal">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                <span className="text-gray-600">Completed (Last 14 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-gray-600">Scheduled (Next 30 days)</span>
              </div>
            </div>
          </CardTitle>
          <CardDescription>Track your review history and upcoming workload</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewChart pastData={pastData} futureData={futureData} />
        </CardContent>
      </Card>

      {/* Daily Study Log */}
      <div>
        <h2 className="text-xl font-bold mb-4">Daily Study Log</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {dailyStats.length > 0 ? (
                <div className="divide-y divide-slate-100">
                    {dailyStats.map(([date, data]) => (
                        <div key={date} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-bold text-slate-700 w-24">{date}</div>
                                <div className="text-lg font-bold text-indigo-600">{formatDuration(data.total)}</div>
                            </div>
                            <div className="flex gap-3 text-xs text-slate-500">
                                {data.types['LISTENING'] && (
                                    <span className="bg-slate-100 px-2 py-1 rounded">👂 {formatDuration(data.types['LISTENING'])}</span>
                                )}
                                {data.types['SHADOWING'] && (
                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">🎤 {formatDuration(data.types['SHADOWING'])}</span>
                                )}
                                {data.types['REVIEW'] && (
                                    <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded">📝 {formatDuration(data.types['REVIEW'])}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400">No study sessions recorded yet. Start practicing!</div>
            )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Tracks</div>
             <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-500" />
                {totalTracks}
             </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Vault Sentences</div>
             <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-purple-500" />
                {totalSentences}
             </div>
          </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6 w-full">
      {/* First Row: 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      {/* Second Row: 3 Chart Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Skeleton className="h-64 w-full rounded-xl" />
         <Skeleton className="h-64 w-full rounded-xl" />
         <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
