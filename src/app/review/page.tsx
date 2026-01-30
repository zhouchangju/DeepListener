import { prisma } from "@/lib/prisma";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage() {
  const rawItems = await prisma.reviewItem.findMany({
    where: {
      nextReview: {
        lte: new Date(),
      },
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
    orderBy: { nextReview: "asc" },
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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Sentence Vault</h1>
      {items.length > 0 ? (
        <ReviewClient items={items} />
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border">
          <p className="text-gray-500">No sentences due for review. Great job!</p>
        </div>
      )}
    </div>
  );
}
