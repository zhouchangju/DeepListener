import { prisma } from "@/lib/prisma";
import ReviewClient from "./ReviewClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";
import { endOfLocalDay, startOfLocalDay } from "@/lib/local-day";
import DatabaseRecoveryState from "@/components/readiness/DatabaseRecoveryState";
import { getDatabaseRouteReadiness } from "@/lib/route-readiness";
import { getDueReviewItemIds } from "@/lib/review-queue-summary";

export default async function ReviewPage() {
  const readiness = await getDatabaseRouteReadiness();
  if (!readiness.ok && readiness.check) {
    return <DatabaseRecoveryState check={readiness.check} />;
  }

  const t = await getTranslations("review");
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">{t("sessionTitle")}</h1>
      <Suspense fallback={<ReviewSkeleton />}>
        <ReviewContent />
      </Suspense>
    </div>
  );
}

export const revalidate = 0; // Disable caching, always fetch fresh data
export const dynamic = 'force-dynamic'; // Force dynamic rendering

async function ReviewContent() {
  const now = new Date();
  const startOfToday = startOfLocalDay(now);
  const endOfToday = endOfLocalDay(now);

  // Run initial queries in parallel
  const [todayLogs, todayReviews, dueCandidates] = await Promise.all([
    prisma.reviewLog.findMany({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      select: { reviewItemId: true },
    }),
    prisma.reviewLog.groupBy({
      by: ['reviewItemId'],
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      _max: { rating: true },
    }),
    prisma.reviewItem.findMany({
      where: { due: { lte: now }, isArchived: false },
      select: { id: true },
      orderBy: { due: "asc" },
    }),
  ]);

  // Count unique items reviewed today
  const reviewedItemIds = new Set(todayLogs.map(log => log.reviewItemId));
  const todayReviewedCount = reviewedItemIds.size;

  const dueItemIds = getDueReviewItemIds(
    dueCandidates.map((item) => item.id),
    todayReviews.map((review) => ({
      reviewItemId: review.reviewItemId,
      rating: review._max.rating,
    })),
  );

  // Get items that are due NOW
  const rawItems = await prisma.reviewItem.findMany({
    where: { id: { in: dueItemIds } },
    select: {
      id: true,
      userNote: true,
      difficulty: true,
      isArchived: true,
      createdAt: true,
      tags: {
        select: { id: true, name: true }
      },
      sentence: {
        select: {
          id: true,
          text: true,
          startTime: true,
          endTime: true,
          formatting: true,
          track: {
            select: {
              id: true,
              audioUrl: true,
              title: true
            }
          }
        }
      },
      logs: {
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
        select: { id: true },
      },
      _count: {
        select: { logs: true }
      }
    },
    orderBy: { due: "asc" },
  });

  const items = rawItems.map(item => {
    const daysSinceCreation = Math.max(1, Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const averageDailyListens = item._count.logs / daysSinceCreation;
    return {
      ...item,
      reviewedToday: item.logs.length > 0,
      stats: {
        totalListens: item._count.logs,
        averageDailyListens
      }
    };
  });

  if (items.length === 0) {
    const t = await getTranslations("review");
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-dashed">
        <p className="text-muted-foreground">{t("noDue")}</p>
      </div>
    );
  }

  return (
    <ReviewClient
      items={items}
      reviewedCount={todayReviewedCount}
    />
  );
}

function ReviewSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <Skeleton className="h-[200px] w-full rounded-2xl" />
      <div className="flex justify-center gap-4">
        <Skeleton className="h-12 w-32 rounded-lg" />
        <Skeleton className="h-12 w-32 rounded-lg" />
        <Skeleton className="h-12 w-32 rounded-lg" />
      </div>
    </div>
  );
}
