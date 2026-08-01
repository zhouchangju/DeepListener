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

    // Wrap the upsert in a transaction. SQLite's upsert semantics under
    // Prisma can race on the unique [date, type] constraint: two near-
    // simultaneous requests may both miss the row and both take the create
    // branch, dropping the prior accumulated minutes. Reading then
    // incrementing inside a transaction serializes the two requests so the
    // duration accumulates correctly.
    const session = await prisma.$transaction(async (tx) => {
      const existing = await tx.studySession.findUnique({
        where: {
          date_type: {
            date: today,
            type: type,
          },
        },
      });

      if (existing) {
        return tx.studySession.update({
          where: { id: existing.id },
          data: {
            duration: { increment: duration },
          },
        });
      }

      return tx.studySession.create({
        data: {
          date: today,
          type: type,
          duration: duration,
        },
      });
    });

    return NextResponse.json(session);
  } catch (error: unknown) {
    console.error("Study time error:", error);
    return internalServerError();
  }
}
