import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatZodError, studyTimeSchema } from "@/lib/api-schemas";

export async function POST(req: NextRequest) {
  try {
    const parsed = studyTimeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { type, duration } = parsed.data;

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
  } catch (error: unknown) {
    console.error("Study time error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
