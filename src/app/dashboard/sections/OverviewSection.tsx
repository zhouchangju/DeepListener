"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, Trophy, Clock, Headphones, Mic2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface OverviewSectionProps {
  countdownDays: number;
  reached: boolean;
  targetDateLabel: string;
  learntCount: number;
  progressPercent: number;
  totalHours: number;
  c1Progress: number;
  totalTracks: number;
  totalSentences: number;
}

export function OverviewSection({
  countdownDays,
  reached,
  targetDateLabel,
  learntCount,
  progressPercent,
  totalHours,
  c1Progress,
  totalTracks,
  totalSentences
}: OverviewSectionProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground border-none shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white/85 font-medium text-lg">
              <CalendarClock className="h-5 w-5" /> {t("countdownTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums">{countdownDays}</span>
              <span className="text-xl text-white/80">{reached ? t("reachedLabel") : t("daysLeft")}</span>
            </div>
            <div className="text-sm text-white/70 mt-2">{t("targetDate", { date: targetDateLabel })}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/15 shadow-sm dark:border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-primary dark:text-primary">
              <Trophy className="h-5 w-5 text-yellow-500" /> {t("progressTitle")}
            </CardTitle>
            <CardDescription>{t("progressTarget")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>{t("tracksProgress", { count: learntCount })}</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3 bg-primary/15" />
            <div className="text-xs text-muted-foreground">
              {t("learntNote")}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/15 shadow-sm dark:border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-primary dark:text-primary">
              <Clock className="h-5 w-5 text-blue-500" /> {t("c1Title")}
            </CardTitle>
            <CardDescription>{t("c1Target")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>{t("hoursProgress", { hours: totalHours.toFixed(1) })}</span>
              <span>{c1Progress.toFixed(1)}%</span>
            </div>
            <Progress value={c1Progress} className="h-3 bg-blue-100" />
            <div className="text-xs text-muted-foreground">
              {t("c1Note")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/60 p-4 rounded-xl border border-border">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{t("totalTracksLabel")}</div>
          <div className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            {totalTracks}
          </div>
        </div>
        <div className="bg-muted/60 p-4 rounded-xl border border-border">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{t("vaultSentencesLabel")}</div>
          <div className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-purple-500" />
            {totalSentences}
          </div>
        </div>
      </div>
    </div>
  );
}
