import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 删除收藏
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const { userNote, tags } = await req.json();

    const updated = await prisma.reviewItem.update({
      where: { id },
      data: {
        userNote,
        tags: {
          set: tags.map((t: string) => ({ name: t })),
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
