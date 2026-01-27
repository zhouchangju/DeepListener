import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 删除收藏
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.reviewItem.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新笔记和标签
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userNote, tags, difficulty } = await req.json();

    const data: any = {
      userNote,
      tags: {
        set: tags.map((t: string) => ({ name: t })),
      },
    };

    if (difficulty) data.difficulty = difficulty;

    const updated = await prisma.reviewItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
