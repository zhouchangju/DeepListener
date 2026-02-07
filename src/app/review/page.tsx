import { prisma } from "@/lib/prisma";
import ReviewClient from "./ReviewClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  console.log('[Review] Fetching data for', startOfToday.toISOString(), 'to', endOfToday.toISOString());

  // Get today's review logs
  const todayLogs = await prisma.reviewLog.findMany({
    where: {
      createdAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
    select: {
      reviewItemId: true,
    },
  });

  console.log('[Review] Found', todayLogs.length, 'review logs today');

  // Count unique items reviewed today
  const reviewedItemIds = new Set(todayLogs.map(log => log.reviewItemId));
  const todayReviewedCount = reviewedItemIds.size;

  console.log('[Review] Reviewed today:', todayReviewedCount, 'Unique items:', Array.from(reviewedItemIds));

  // Get today's latest review rating for each reviewed item
  const todayReviews = await prisma.reviewLog.groupBy({
    by: ['reviewItemId'],
    where: {
      createdAt: { gte: startOfToday, lte: endOfToday },
    },
    _max: {
      rating: true,
    },
  });

  // Map items to their latest rating
  const latestRatings = new Map<string, number>();
  todayReviews.forEach(review => {
    if (review._max.rating) {
      latestRatings.set(review.reviewItemId, review._max.rating);
    }
  });

  // Identify relearning items (Again=1 or Hard=2)
  const relearningItemIds = Array.from(latestRatings.entries())
    .filter(([_, rating]) => rating === 1 || rating === 2)
    .map(([itemId, _]) => itemId);

  // Get items that are due NOW with special handling:
  // - Cards NOT reviewed today: show if due
  // - Cards reviewed today with Again/Hard (relearning): show if due (they have new short intervals)
  // - Cards reviewed today with Good/Easy: DON'T show (already learned for today)
  const now = new Date();

  const rawItems = await prisma.reviewItem.findMany({
    where: {
      due: {
        lte: now, // Only show cards that are already due
      },
      isArchived: false,
      OR: [
        // Not reviewed today
        { id: { notIn: Array.from(reviewedItemIds) } },
        // OR reviewed today but it's a relearning card (Again/Hard)
        { id: { in: relearningItemIds } }
      ]
    },
    include: {
      sentence: {
        include: { track: true }
      },
      tags: true,
      logs: {
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        select: { id: true },
      },
      _count: {
        select: { logs: true }
      }
    },
    orderBy: { due: "asc" },
  });

  console.log('[Review] Found', rawItems.length, 'items in queue (not reviewed today)');

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
    console.log('[Review] No items in queue');
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed">
        <p className="text-gray-500">No sentences due for review. Great job!</p>
      </div>
    );
  }

  console.log('[Review] Passing to client - reviewedCount:', todayReviewedCount, 'items.length:', items.length);

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
