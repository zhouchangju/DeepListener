import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatZodError, sentencePatchSchema } from "@/lib/api-schemas";
import { badRequest, internalServerError } from "@/lib/api-response";

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
    console.error("Sentence update error:", error);
    return internalServerError();
  }
}
