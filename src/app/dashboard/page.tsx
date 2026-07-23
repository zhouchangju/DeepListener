import { prisma } from "@/lib/prisma";
import { DashboardTabs } from "./DashboardTabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";
import { getCountdownDays } from "./date-utils";
import { buildDailyStats, buildDashboardData, formatDuration } from "./analytics";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // Read target date from environment variable, default to a future exam window.
  const targetDateStr = process.env.NEXT_PUBLIC_TARGET_DATE || "2026-12-31";
  const targetDate = new Date(targetDateStr);
  const diffDays = getCountdownDays(new Date(), targetDate);
  const reached = diffDays <= 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardContent countdownDays={diffDays} reached={reached} targetDateLabel={formatTargetLabel(targetDate)} />
      </Suspense>
    </div>
  );
}

function formatTargetLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function DashboardContent({
  countdownDays,
  reached,
  targetDateLabel,
}: {
  countdownDays: number;
  reached: boolean;
  targetDateLabel: string;
}) {
  const now = new Date();

  const [tracks, tags, totalSentences, studySessions, reviewLogs, allReviewItems, leeches] = await Promise.all([
    prisma.track.findMany({
      where: { isArchived: false },
      select: { status: true, trackType: true },
    }),
    prisma.errorTag.findMany({
      include: { _count: { select: { reviewItems: true } } },
    }),
    // Count only non-archived items so the denominator matches the other
    // metrics (tracks, leeches, allReviewItems all filter isArchived:false).
    prisma.reviewItem.count({ where: { isArchived: false } }),
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
    // A "leech" is a card the user keeps forgetting — driven by lapse count,
    // not by FSRS difficulty (dr). Previously `dr: { gt: 8 }` excluded easy
    // cards that had lapsed >5 times and was also corrupted by the dr=0
    // default for vault-created items.
    prisma.reviewItem.findMany({
      where: {
        isArchived: false,
        lapse: { gt: 5 }
      },
      select: { id: true, sentence: { select: { text: true } } },
      take: 5
    })
  ]);

  const dashboardData = buildDashboardData({
    countdownDays,
    reached,
    targetDateLabel,
    tracks,
    tags,
    totalSentences,
    studySessions,
    reviewLogs,
    allReviewItems,
    leeches,
    now,
  });
  const dailyStats = buildDailyStats(studySessions);
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-10 w-full pb-10">
      <h1 className="sr-only">{t("srTitle")}</h1>
      <DashboardTabs data={dashboardData} />

      <div>
        <h2 className="text-xl font-bold mb-4">{t("dailyLogTitle")}</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            {dailyStats.length > 0 ? (
                <div className="divide-y divide-border">
                    {dailyStats.map(([date, data]) => (
                        <div key={date} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-accent">
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-bold text-foreground w-24">{date}</div>
                                <div className="text-lg font-bold text-primary">{formatDuration(data.total)}</div>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                                {data.types['LISTENING'] && (
                                    <span className="bg-muted px-2 py-1 rounded">👂 {formatDuration(data.types['LISTENING'])}</span>
                                )}
                                {data.types['SHADOWING'] && (
                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">🎤 {formatDuration(data.types['SHADOWING'])}</span>
                                )}
                                {data.types['REVIEW'] && (
                                    <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded">📝 {formatDuration(data.types['REVIEW'])}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">{t("noSessions")}</div>
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
