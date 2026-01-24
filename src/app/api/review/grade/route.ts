import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { reviewItemId, quality } = await req.json();

    const currentItem = await prisma.reviewItem.findUnique({
      where: { id: reviewItemId },
    });

    if (!currentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const intervals = [0, 4, 12, 24, 72, 168]; // hours: 0, 4h, 12h, 1d, 3d, 7d
    
    let newLevel = currentItem.level;
    if (quality === "again") {
      newLevel = 0;
    } else if (quality === "good") {
      newLevel = Math.min(currentItem.level + 1, intervals.length - 1);
    }

    const nextReviewDate = new Date();
    nextReviewDate.setHours(nextReviewDate.getHours() + intervals[newLevel]);

    const updated = await prisma.reviewItem.update({
      where: { id: reviewItemId },
      data: {
        level: newLevel,
        nextReview: nextReviewDate,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Grade error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
