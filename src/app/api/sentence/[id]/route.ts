import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatZodError, sentencePatchSchema } from "@/lib/api-schemas";
import { badRequest, internalServerError, notFound } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = sentencePatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const sentence = await prisma.sentence.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(sentence);
  } catch (error: unknown) {
    // P2025 = record not found; surface as 404 instead of a generic 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Sentence not found");
    }
    console.error("Sentence update error:", error);
    return internalServerError();
  }
}
