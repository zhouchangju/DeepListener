import { prisma } from "@/lib/prisma";
import { DashboardTabs } from "./DashboardTabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCountdownDays } from "./date-utils";
import { buildDailyStats, buildDashboardData, formatDuration } from "./analytics";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // Read target date from environment variable, default to 2026-05-16
  const targetDateStr = process.env.NEXT_PUBLIC_TARGET_DATE || "2026-05-16";
  const targetDate = new Date(targetDateStr);
  const diffDays = getCountdownDays(new Date(), targetDate);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardContent countdownDays={diffDays} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ countdownDays }: { countdownDays: number }) {
  const now = new Date();

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

  const dashboardData = buildDashboardData({
    countdownDays,
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
