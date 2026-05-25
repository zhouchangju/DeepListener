import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { formatZodError, trackPatchSchema } from "@/lib/api-schemas";
import { resolveStoredUploadPath } from "@/lib/upload-policy";

// DELETE (保持不变)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const track = await prisma.track.findUnique({ where: { id } });

    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    const filePath = resolveStoredUploadPath(track.audioUrl);
    if (filePath) {
      try {
        await unlink(filePath);
      } catch (e) {
        console.warn("Failed to delete audio file:", e);
      }
    }

    await prisma.track.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: 更新标题或归档状态
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = trackPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const track = await prisma.track.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(track);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
