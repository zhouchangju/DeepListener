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

async function ReviewContent() {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const totalDue = await prisma.reviewItem.count({
    where: {
      due: {
        lte: endOfToday,
      },
      isArchived: false,
    },
  });

  const rawItems = await prisma.reviewItem.findMany({
    take: 50,
    where: {
      due: {
        lte: endOfToday,
      },
      isArchived: false,
    },
    include: {
      sentence: {
        include: { track: true }
      },
      tags: true,
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
      stats: {
        totalListens: item._count.logs,
        averageDailyListens
      }
    };
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed">
        <p className="text-gray-500">No sentences due for review. Great job!</p>
      </div>
    );
  }

  return <ReviewClient items={items} totalDue={totalDue} />;
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
