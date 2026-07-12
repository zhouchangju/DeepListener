import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { formatZodError, trackPatchSchema } from "@/lib/api-schemas";
import { resolveStoredUploadPath, resolveStoredVideoPath } from "@/lib/upload-policy";
import { badRequest, internalServerError, notFound } from "@/lib/api-response";

// DELETE (保持不变)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const track = await prisma.track.findUnique({ where: { id } });

    if (!track) return notFound("Track not found");

    const filePath = resolveStoredUploadPath(track.audioUrl);
    if (filePath) {
      try {
        await unlink(filePath);
      } catch (e) {
        console.warn("Failed to delete audio file:", e);
      }
    }

    const videoPath = track.videoUrl ? resolveStoredVideoPath(track.videoUrl) : null;
    if (videoPath) {
      try {
        await unlink(videoPath);
      } catch (e) {
        console.warn("Failed to delete video file:", e);
      }
    }

    await prisma.track.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Track delete error:", error);
    return internalServerError();
  }
}

// PATCH: 更新标题或归档状态
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = trackPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const track = await prisma.track.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(track);
  } catch (error: unknown) {
    console.error("Track update error:", error);
    return internalServerError();
  }
}
