import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

// DELETE (保持不变)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const track = await prisma.track.findUnique({ where: { id } });

    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    if (track.audioUrl.startsWith("/uploads/")) {
      const fileName = track.audioUrl.replace("/uploads/", "");
      const filePath = path.join(process.cwd(), "public/uploads", fileName);
      try { await unlink(filePath); } catch (e) {}
    }

    await prisma.track.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: 更新标题或归档状态
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // 过滤只允许更新的字段
    const data: any = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.isArchived === "boolean") data.isArchived = body.isArchived;
    if (typeof body.isLearnt === "boolean") data.isLearnt = body.isLearnt;

    const track = await prisma.track.update({
      where: { id },
      data,
    });

    return NextResponse.json(track);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}