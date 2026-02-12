import { prisma } from "@/lib/prisma";
import { DashboardTabs } from "./DashboardTabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DashboardPage() {
  const targetDate = new Date("2026-05-10");
  const today = new Date();
  const diffTime = Math.abs(targetDate.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardContent countdownDays={diffDays} />
      </Suspense>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  UNLEARNT: "未学习",
  INTENSIVE: "精听",
  ANALYSIS: "分析",
  SHADOWING: "Shadowing",
  SPEED_SHADOWING: "倍速 Shadowing",
  PARAPHRASE: "Paraphrase",
  LEARNT: "已学习",
};

function groupByCount<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countsToChartData(counts: Record<string, number>): Array<{ name: string; value: number }> {
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

async function DashboardContent({ countdownDays }: { countdownDays: number }) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const [tracks, tags, totalSentences, studySessions, reviewLogs, allReviewItems, leeches] = await Promise.all([
    prisma.track.findMany({
      where: { isArchived: false },
      select: { status: true, trackType: true },
    }),
    prisma.errorTag.findMany({
      include: { _count: { select: { reviewItems: true } } },
    }),
    prisma.reviewItem.count(),
    prisma.studySession.findMany({
      where: {
        date: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { date: 'desc' },
    }),
    prisma.reviewLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: { createdAt: true, reviewItemId: true, rating: true },
    }),
    prisma.reviewItem.findMany({
      where: { isArchived: false },
      select: {
        due: true,
        stability: true,
        difficulty: true,
        lapse: true,
        sentence: {
          select: {
            track: { select: { trackType: true } }
          }
        }
      },
    }),
    prisma.reviewItem.findMany({
      where: {
        isArchived: false,
        dr: { gt: 8 },
        lapse: { gt: 5 }
      },
      select: { id: true, sentence: { select: { text: true } } },
      take: 5
    })
  ]);

  // Data Aggregation
  const stabilityBins = { "New": 0, "Short-term": 0, "Mid-term": 0, "Long-term": 0, "Mature": 0 };
  allReviewItems.forEach(item => {
    const s = item.stability;
    if (s === 0) stabilityBins["New"]++;
    else if (s < 7) stabilityBins["Short-term"]++;
    else if (s < 30) stabilityBins["Mid-term"]++;
    else if (s < 365) stabilityBins["Long-term"]++;
    else stabilityBins["Mature"]++;
  });
  const stabilityData = Object.entries(stabilityBins).map(([name, value]) => ({ name, value }));

  const dailyRetention: Record<string, { total: number; success: number }> = {};
  reviewLogs.forEach(log => {
    const dateKey = log.createdAt.toISOString().split('T')[0];
    if (!dailyRetention[dateKey]) dailyRetention[dateKey] = { total: 0, success: 0 };
    dailyRetention[dateKey].total++;
    if (log.rating > 1) dailyRetention[dateKey].success++;
  });

  const retentionData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().split('T')[0];
    const stats = dailyRetention[key] || { total: 0, success: 0 };
    return {
      date: key.slice(5),
      retention: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100
    };
  });

  const overdueBins = { "Today": 0, "1-3d": 0, "4-7d": 0, "1w+": 0 };
  allReviewItems.forEach(item => {
    const dueDate = new Date(item.due);
    if (dueDate >= todayStart) return;
    const diffDays = Math.floor((todayStart.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) overdueBins["Today"]++;
    else if (diffDays <= 3) overdueBins["1-3d"]++;
    else if (diffDays <= 7) overdueBins["4-7d"]++;
    else overdueBins["1w+"]++;
  });
  const overdueData = Object.entries(overdueBins).map(([name, value]) => ({ name, value }));

  const heatmapData: Record<string, number> = {};
  studySessions.forEach(s => {
    const key = s.date.toISOString().split('T')[0];
    heatmapData[key] = (heatmapData[key] || 0) + s.duration;
  });

  const masteryByType: Record<string, { stability: number; count: number }> = {};
  allReviewItems.forEach(item => {
    const type = item.sentence.track.trackType || "Other";
    if (!masteryByType[type]) masteryByType[type] = { stability: 0, count: 0 };
    masteryByType[type].stability += item.stability;
    masteryByType[type].count++;
  });
  const radarData = Object.entries(masteryByType).map(([type, stats]) => ({
    subject: type,
    A: Math.min(Math.round((stats.stability / stats.count / 30) * 100), 100),
    fullMark: 100
  }));

  const pastReviewsByDateSet: Record<string, Set<string>> = {};
  reviewLogs.forEach(log => {
    const dateKey = log.createdAt.toISOString().split('T')[0];
    if (!pastReviewsByDateSet[dateKey]) pastReviewsByDateSet[dateKey] = new Set();
    pastReviewsByDateSet[dateKey].add(log.reviewItemId);
  });
  const pastReviewsByDate: Record<string, number> = {};
  for (const [date, itemSet] of Object.entries(pastReviewsByDateSet)) pastReviewsByDate[date] = itemSet.size;

  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (7 - i));
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  });
  const pastData = past7Days.map(date => ({ date, count: pastReviewsByDate[date] || 0 }));

  const futureReviewsByDate: Record<string, number> = {};
  const future7Days = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + i);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  });
  const todayKey = todayStart.toISOString().split('T')[0];
  allReviewItems.forEach(item => {
    const dueDate = new Date(item.due);
    dueDate.setUTCHours(0, 0, 0, 0);
    const dateKey = dueDate.toISOString().split('T')[0];
    if (dueDate < todayStart) futureReviewsByDate[todayKey] = (futureReviewsByDate[todayKey] || 0) + 1;
    else if (future7Days.includes(dateKey)) futureReviewsByDate[dateKey] = (futureReviewsByDate[dateKey] || 0) + 1;
  });
  const futureData = future7Days.map(date => ({ date, count: futureReviewsByDate[date] || 0 }));

  const totalDurationSeconds = studySessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = totalDurationSeconds / 3600;
  const c1Progress = Math.min((totalHours / 400) * 100, 100);

  const totalTracks = tracks.length;
  const learntCount = tracks.filter(t => t.status === "LEARNT").length;
  const progressPercent = Math.min(Math.round((learntCount / 100) * 100), 100);
  const statusCounts = groupByCount(tracks, t => STATUS_LABELS[t.status] || t.status);
  const statusData = countsToChartData(statusCounts);
  const typeCounts = groupByCount(tracks, t => t.trackType || "Uncategorized");
  const typeData = countsToChartData(typeCounts).sort((a, b) => b.value - a.value);
  const tagData = tags.map(t => ({ name: t.name, value: t._count.reviewItems }));

  const sessionsByDate: Record<string, { total: number; types: Record<string, number> }> = {};
  for (const s of studySessions) {
    const dateKey = s.date.toISOString().split('T')[0];
    if (!sessionsByDate[dateKey]) sessionsByDate[dateKey] = { total: 0, types: {} };
    sessionsByDate[dateKey].total += s.duration;
    sessionsByDate[dateKey].types[s.type] = (sessionsByDate[dateKey].types[s.type] || 0) + s.duration;
  }
  const dailyStats = Object.entries(sessionsByDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

  const dashboardData = {
    countdownDays,
    learntCount,
    progressPercent,
    totalHours,
    c1Progress,
    statusData,
    typeData,
    totalTracks,
    totalSentences,
    stabilityData,
    retentionData,
    leeches,
    pastData,
    futureData,
    overdueData,
    heatmapData,
    radarData,
    tagData
  };

  return (
    <div className="space-y-10 w-full pb-10">
      <DashboardTabs data={dashboardData} />

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
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Skeleton className="h-64 w-full rounded-xl" />
         <Skeleton className="h-64 w-full rounded-xl" />
         <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}