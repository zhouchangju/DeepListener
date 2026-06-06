import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatZodError, studyTimeSchema } from "@/lib/api-schemas";
import { badRequest, internalServerError } from "@/lib/api-response";
import { startOfLocalDay } from "@/lib/local-day";

export async function POST(req: NextRequest) {
  try {
    const parsed = studyTimeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const { type, duration } = parsed.data;
    const today = startOfLocalDay();

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
    return internalServerError();
  }
}
