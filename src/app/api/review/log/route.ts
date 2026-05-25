import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, internalServerError } from "@/lib/api-response";
import { formatZodError, reviewLogSchema } from "@/lib/api-schemas";

export async function POST(req: NextRequest) {
  try {
    const parsed = reviewLogSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    await prisma.reviewLog.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Review log error:", error);
    return internalServerError();
  }
}
