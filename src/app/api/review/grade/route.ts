import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNextReview } from "@/lib/fsrs";
import { formatZodError, reviewGradeSchema, type ReviewQuality } from "@/lib/api-schemas";
import { badRequest, notFound, internalServerErrorFrom } from "@/lib/api-response";

function mapRatingToNumber(quality: ReviewQuality): number {
  switch (quality) {
    case 'again': return 1;
    case 'hard': return 2;
    case 'good': return 3;
    case 'easy': return 4;
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = reviewGradeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const { reviewItemId, quality } = parsed.data;

    // Run the read-compute-write inside a transaction so concurrent grades
    // for the same item cannot read the same pre-grade state and silently
    // drop one another's FSRS progression (lost update).
    const result = await prisma.$transaction(async (tx) => {
      const currentItem = await tx.reviewItem.findUnique({
        where: { id: reviewItemId },
      });

      if (!currentItem) {
        return { kind: 'notFound' as const };
      }

      // Use FSRS algorithm to calculate next review
      const next = calculateNextReview(
        {
          stability: currentItem.stability,
          difficulty: currentItem.dr,
          state: currentItem.state,
          reps: currentItem.reps,
          lapses: currentItem.lapses,
          lastReview: currentItem.lastReview,
          due: currentItem.due,
        },
        quality
      );

      const isAgain = quality === 'again';
      const isHard = quality === 'hard';

      // Apply custom short intervals for Again/Hard (override FSRS due only).
      // We intentionally persist the FSRS-derived stability/state/reps/lapses
      // so the scheduler keeps progressing, but pin `due`/`nextReview` to a
      // short interval to surface the card again soon. Counters use atomic
      // increment so concurrent grades cannot drop updates.
      const shortInterval = isAgain ? 5 : isHard ? 15 : 0;
      const actualDue = shortInterval > 0
        ? (() => {
            const due = new Date();
            due.setMinutes(due.getMinutes() + shortInterval);
            return due;
          })()
        : next.nextReview;

      // retrieval counts a "success" (good/easy/hard all kept the card);
      // lapse counts an "again" (forgotten). hard still counts as a successful
      // retrieval so it is included in the denominator of successRate.
      const retrievalIncrement = isAgain ? 0 : 1;
      const lapseIncrement = isAgain ? 1 : 0;

      const updated = await tx.reviewItem.update({
        where: { id: reviewItemId },
        data: {
          stability: next.stability,
          dr: next.difficulty,
          state: next.state,
          reps: next.reps,
          lapses: next.lapses,
          lastReview: next.lastReview,
          due: actualDue,
          retrieval: { increment: retrievalIncrement },
          lapse: { increment: lapseIncrement },
          nextReview: actualDue,
          logs: {
            create: {
              rating: mapRatingToNumber(quality),
            },
          },
        },
      });

      return { kind: 'ok' as const, updated };
    });

    if (result.kind === 'notFound') {
      return notFound("Item not found");
    }

    return NextResponse.json({
      updated: result.updated,
    });
  } catch (error: unknown) {
    return internalServerErrorFrom(error, "DB_CONSTRAINT");
  }
}
