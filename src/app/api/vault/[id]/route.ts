import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatZodError, vaultPatchSchema } from "@/lib/api-schemas";
import { badRequest, internalServerErrorFrom, notFound } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.reviewItem.findUnique({
      where: { id },
      select: {
        id: true,
        userNote: true,
      },
    });

    if (!item) {
      return notFound("Vault item not found");
    }

    return NextResponse.json(item);
  } catch (error: unknown) {
    // Without this, a DB rejection surfaces as an unhandled promise rejection
    // and the client gets a generic Next.js 500 page instead of the JSON error
    // contract every other route here uses.
    return internalServerErrorFrom(error);
  }
}

// Soft-delete: the previous hard delete cascaded to ReviewLog children and
// permanently destroyed the user's review history. We now archive the item
// instead, preserving history. The vault query already filters
// isArchived:false, so archived items disappear from the default list.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.reviewItem.update({
      where: { id },
      data: { isArchived: true },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Vault item not found");
    }
    return internalServerErrorFrom(error);
  }
}

// 更新笔记和标签
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = vaultPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const { userNote, tags, difficulty } = parsed.data;
    const data: { userNote?: string | null; tags?: { set: { name: string }[] }; difficulty?: string } = {};

    if (userNote !== undefined) data.userNote = userNote;
    if (difficulty !== undefined) data.difficulty = difficulty;

    // Wrap tag upserts + reviewItem update in a transaction so a failed
    // reviewItem update cannot leave orphan ErrorTag rows. The whole PATCH
    // runs atomically.
    const updated = await prisma.$transaction(async (tx) => {
      if (tags !== undefined) {
        for (const tagName of tags) {
          await tx.errorTag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
        }

        data.tags = {
          set: tags.map((t) => ({ name: t })),
        };
      }

      return tx.reviewItem.update({
        where: { id },
        data,
      });
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Vault item not found");
    }
    return internalServerErrorFrom(error);
  }
}
