import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatZodError, vaultPatchSchema } from "@/lib/api-schemas";
import { notFound } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
}

// 删除收藏
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.reviewItem.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 更新笔记和标签
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = vaultPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { userNote, tags, difficulty } = parsed.data;
    const data: { userNote?: string | null; tags?: { set: { name: string }[] }; difficulty?: string } = {};

    if (userNote !== undefined) data.userNote = userNote;

    // Only update tags if provided
    if (tags !== undefined) {
      for (const tagName of tags) {
        await prisma.errorTag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
      }

      data.tags = {
        set: tags.map((t) => ({ name: t })),
      };
    }

    if (difficulty) data.difficulty = difficulty;

    const updated = await prisma.reviewItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
