import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNextReview } from "@/lib/fsrs";

function mapRatingToNumber(quality: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (quality) {
    case 'again': return 1;
    case 'hard': return 2;
    case 'good': return 3;
    case 'easy': return 4;
    default: return 3;
  }
}

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
    const isHard = quality === 'hard';

    // Apply custom intervals for Again/Hard (override FSRS)
    const shortInterval = isAgain ? 5 : isHard ? 15 : 0;
    const actualDue = shortInterval > 0
      ? (() => {
          const due = new Date();
          due.setMinutes(due.getMinutes() + shortInterval);
          return due;
        })()
      : next.nextReview;

    const updated = await prisma.reviewItem.update({
      where: { id: reviewItemId },
      data: {
        stability: next.stability,
        dr: next.difficulty,
        due: actualDue,
        retrieval: isAgain ? currentItem.retrieval : (currentItem.retrieval ?? 0) + 1,
        lapse: isAgain ? (currentItem.lapse ?? 0) + 1 : currentItem.lapse,
        nextReview: actualDue,
        logs: {
          create: {
            rating: mapRatingToNumber(quality),
          },
        },
      },
    });

    return NextResponse.json({
      updated,
    });
  } catch (error: unknown) {
    console.error("Grade error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
