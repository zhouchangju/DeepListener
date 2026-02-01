import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { type, duration } = await req.json();

    if (!type || !duration) {
      return NextResponse.json({ error: "Missing type or duration" }, { status: 400 });
    }

    // Get today's date at 00:00:00 UTC (or local? Prisma DateTime is usually UTC)
    // To ensure consistency, we use a simple date string approach 'YYYY-MM-DD' converted to Date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const today = new Date(dateStr);

    const session = await prisma.studySession.upsert({
      where: {
        date_type: {
          date: today,
          type: type,
        },
      },
      update: {
        duration: { increment: duration },
      },
      create: {
        date: today,
        type: type,
        duration: duration,
      },
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Study time error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
