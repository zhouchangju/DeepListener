import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNextReview } from "@/lib/fsrs";

export async function POST(req: NextRequest) {
  try {
    const { reviewItemId, quality }: { reviewItemId: string; quality: 'again' | 'hard' | 'good' | 'easy' } = await req.json();

    const currentItem = await prisma.reviewItem.findUnique({
      where: { id: reviewItemId },
    });

    if (!currentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Use FSRS algorithm to calculate next review
    const next = calculateNextReview(
      {
        stability: currentItem.stability,
        difficulty: currentItem.dr,
        due: currentItem.due,
      },
      quality
    );

    // Update retrieval and lapse counts
    const isAgain = quality === 'again';
    const updated = await prisma.reviewItem.update({
      where: { id: reviewItemId },
      data: {
        // FSRS fields
        stability: next.stability,
        dr: next.difficulty,
        // For "Again", keep due as now so it stays in current queue after refresh
        due: isAgain ? new Date() : next.nextReview,
        retrieval: isAgain
          ? currentItem.retrieval
          : (currentItem.retrieval ?? 0) + 1,
        lapse: isAgain
          ? (currentItem.lapse ?? 0) + 1
          : currentItem.lapse,

        // Keep legacy fields in sync for backward compatibility
        nextReview: isAgain ? new Date() : next.nextReview,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Grade error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
