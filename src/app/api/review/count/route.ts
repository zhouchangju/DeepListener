import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { endOfLocalDay, startOfLocalDay } from "@/lib/local-day";
import { getDueReviewItemIds } from "@/lib/review-queue-summary";
import { internalServerError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** A small read-only projection for the global navigation badge. */
export async function GET() {
  try {
    const now = new Date();
    const [dueItems, todayLogs] = await Promise.all([
      prisma.reviewItem.findMany({
        where: { due: { lte: now }, isArchived: false },
        select: { id: true },
        orderBy: { due: "asc" },
      }),
      prisma.reviewLog.findMany({
        where: {
          createdAt: { gte: startOfLocalDay(now), lte: endOfLocalDay(now) },
          reviewItem: { isArchived: false },
        },
        select: { reviewItemId: true, rating: true },
      }),
    ]);

    const count = getDueReviewItemIds(
      dueItems.map((item) => item.id),
      todayLogs,
    ).length;

    return NextResponse.json(
      { count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return internalServerError();
  }
}
