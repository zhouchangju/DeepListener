import { prisma } from "@/lib/prisma";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage() {
  const items = await prisma.reviewItem.findMany({
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
    },
    orderBy: { nextReview: "asc" },
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
