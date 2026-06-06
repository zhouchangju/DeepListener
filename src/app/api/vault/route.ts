import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatZodError, vaultCreateSchema } from "@/lib/api-schemas";
import { badRequest, internalServerError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const parsed = vaultCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const { sentenceId, tags, note, difficulty } = parsed.data;

    // Ensure tags exist in DB
    for (const tagName of tags) {
      await prisma.errorTag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
      });
    }

    const reviewItem = await prisma.reviewItem.upsert({
      where: { sentenceId },
      update: {
        userNote: note,
        difficulty, // Update difficulty if exists
        tags: {
          set: tags.map((t: string) => ({ name: t })),
        },
      },
      create: {
        sentenceId,
        userNote: note,
        difficulty, // Set initial difficulty
        tags: {
          connect: tags.map((t: string) => ({ name: t })),
        },
      },
    });

    return NextResponse.json(reviewItem);
  } catch (error: unknown) {
    console.error("Vault error:", error);
    return internalServerError();
  }
}
