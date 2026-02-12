import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, Trophy, Clock, Headphones, Mic2 } from "lucide-react";
import { StatusRingChart, TypeDistributionChart } from "../StatsCharts";

interface OverviewSectionProps {
  countdownDays: number;
  learntCount: number;
  progressPercent: number;
  totalHours: number;
  c1Progress: number;
  statusData: any[];
  typeData: any[];
  totalTracks: number;
  totalSentences: number;
}

export function OverviewSection({
  countdownDays,
  learntCount,
  progressPercent,
  totalHours,
  c1Progress,
  statusData,
  typeData,
  totalTracks,
  totalSentences
}: OverviewSectionProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
