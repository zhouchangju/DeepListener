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

    const isAgain = quality === 'again';
    const againDue = new Date();
    againDue.setDate(againDue.getDate() + 1);
    againDue.setHours(0, 0, 0, 0);

    const updated = await prisma.reviewItem.update({
      where: { id: reviewItemId },
      data: {
        stability: next.stability,
        dr: next.difficulty,
        due: isAgain ? againDue : next.nextReview,
        retrieval: isAgain ? currentItem.retrieval : (currentItem.retrieval ?? 0) + 1,
        lapse: isAgain ? (currentItem.lapse ?? 0) + 1 : currentItem.lapse,
        nextReview: isAgain ? againDue : next.nextReview,
      },
    });

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const remainingDue = await prisma.reviewItem.count({
      where: {
        due: {
          lte: endOfToday,
        },
        isArchived: false,
      },
    });

    return NextResponse.json({
      updated,
      remainingDue,
    });
  } catch (error: unknown) {
    console.error("Grade error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
