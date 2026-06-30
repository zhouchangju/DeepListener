import { prisma } from "@/lib/prisma";
import ReviewClient from "./ReviewClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { endOfLocalDay, startOfLocalDay } from "@/lib/local-day";

export default function ReviewPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Review Session</h1>
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
  const [todayLogs, todayReviews] = await Promise.all([
    prisma.reviewLog.findMany({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      select: { reviewItemId: true },
    }),
    prisma.reviewLog.groupBy({
      by: ['reviewItemId'],
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      _max: { rating: true },
    })
  ]);

  // Count unique items reviewed today
  const reviewedItemIds = new Set(todayLogs.map(log => log.reviewItemId));
  const todayReviewedCount = reviewedItemIds.size;

  // Identify relearning items (Again=1 or Hard=2)
  const relearningItemIds = todayReviews
    .filter(review => review._max.rating === 1 || review._max.rating === 2)
    .map(review => review.reviewItemId);

  // Get items that are due NOW
  const rawItems = await prisma.reviewItem.findMany({
    where: {
      due: { lte: now },
      isArchived: false,
      OR: [
        { id: { notIn: Array.from(reviewedItemIds) } },
        { id: { in: relearningItemIds } }
      ]
    },
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
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-dashed">
        <p className="text-muted-foreground">No sentences due for review. Great job!</p>
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
