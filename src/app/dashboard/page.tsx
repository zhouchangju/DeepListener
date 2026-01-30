import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ErrorTagChart, { StatusRingChart, TypeDistributionChart } from "./StatsCharts";
import { Progress } from "@/components/ui/progress";
import { Trophy, CalendarClock, Headphones, Mic2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  UNLEARNT: "未学习",
  INTENSIVE: "精听",
  ANALYSIS: "分析",
  SHADOWING: "Shadowing",
  SPEED_SHADOWING: "倍速 Shadowing",
  PARAPHRASE: "Paraphrase",
  LEARNT: "已学习",
};

export default async function DashboardPage() {
  // 1. TOEFL Countdown
  const targetDate = new Date("2026-05-10");
  const today = new Date();
  const diffTime = Math.abs(targetDate.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 2. Status Stats
  const tracks = await prisma.track.findMany({
    where: { isArchived: false },
    select: { status: true, trackType: true },
  });

  const totalTracks = tracks.length;
  const learntCount = tracks.filter(t => t.status === "LEARNT").length;
  const progressPercent = Math.min(Math.round((learntCount / 100) * 100), 100);

  // Group by Status
  const statusCounts: Record<string, number> = {};
  tracks.forEach(t => {
    const label = STATUS_LABELS[t.status] || t.status;
    statusCounts[label] = (statusCounts[label] || 0) + 1;
  });
  
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Group by Type
  const typeCounts: Record<string, number> = {};
  tracks.forEach(t => {
    const type = t.trackType || "Uncategorized";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const typeData = Object.entries(typeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 3. Error Tags Stats
  const tags = await prisma.errorTag.findMany({
    include: { _count: { select: { reviewItems: true } } },
  });
  const tagData = tags.map((t) => ({ name: t.name, value: t._count.reviewItems }));

  const totalSentences = await prisma.reviewItem.count();

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      
      {/* Top Banner: Countdown & Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-indigo-100 font-medium text-lg">
              <CalendarClock className="h-5 w-5" /> TOEFL Countdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{diffDays}</span>
              <span className="text-xl text-indigo-100">days left</span>
            </div>
            <div className="text-sm text-indigo-200 mt-2">Target Date: May 10, 2026</div>
          </CardContent>
        </Card>

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Learning Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
             {statusData.length > 0 ? (
                <StatusRingChart data={statusData} />
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
             )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card className="col-span-1">
          <CardHeader>
             <CardTitle className="text-base">Content Types</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
             {typeData.length > 0 ? (
                <TypeDistributionChart data={typeData} />
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
             )}
          </CardContent>
        </Card>

        {/* Error Attribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Error Attribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
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
