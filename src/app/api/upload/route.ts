import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, jsonError } from "@/lib/api-response";
import { toPublicUploadError } from "@/lib/upload-error";
import { createImportJob } from "@/lib/import-jobs/create";
import { runImportJob } from "@/lib/import-jobs/run";
import type { ImportUploadSource } from "@/lib/import-jobs/staging";

export const maxDuration = 900;

export async function POST(req: NextRequest) {
  try {
    const encodedName = req.headers.get("x-deeplistener-file-name");
    const size = Number(req.headers.get("x-deeplistener-file-size"));
    if (!encodedName || !req.body || !Number.isSafeInteger(size)) return badRequest("Invalid media upload metadata");
    let name: string;
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      return badRequest("Invalid media file name");
    }
    const file: ImportUploadSource = {
      name,
      type: req.headers.get("content-type") ?? undefined,
      size,
      stream: req.body,
    };

    // Keep the legacy response shape for existing callers, but route the
    // single-file path through the recoverable operation store. A provider
    // failure now leaves operation-owned media available for retry instead of
    // deleting the only copy and forcing the learner to upload again.
    const operation = await createImportJob(file);
    const completed = await runImportJob(operation.id);
    if (!completed.trackId) {
      return NextResponse.json(
        { error: completed.error?.message ?? "Media import needs attention.", operationId: operation.id, job: completed, ...(completed.error?.code ? { code: completed.error.code } : {}) },
        { status: 502 },
      );
    }
    const track = await prisma.track.findUnique({ where: { id: completed.trackId }, include: { sentences: true } });
    if (!track) return NextResponse.json({ error: "Media import completed but the track could not be found." }, { status: 500 });
    return NextResponse.json(track);
  } catch (error: unknown) {
    const publicError = toPublicUploadError(error);
    console.error("Upload error:", publicError.code ?? "UNKNOWN");
    return NextResponse.json(
      { error: publicError.message, ...(publicError.code ? { code: publicError.code } : {}) },
      { status: publicError.status },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    if (files.length === 0) return badRequest("No files uploaded");

    const results = {
      success: [] as Array<{ id: string; title: string; audioUrl: string; mediaType: string; fileName: string }>,
      failed: [] as Array<{ fileName: string; error: string; operationId?: string; code?: string }>,
    };

    for (const file of files) {
      try {
        const operation = await createImportJob({
          name: file.name,
          type: file.type,
          size: file.size,
          stream: file.stream(),
        });
        const completed = await runImportJob(operation.id);
        if (!completed.trackId) {
          results.failed.push({
            fileName: file.name,
            error: completed.error?.message ?? "Media import needs attention.",
            operationId: operation.id,
            ...(completed.error?.code ? { code: completed.error.code } : {}),
          });
          continue;
        }
        const track = await prisma.track.findUnique({ where: { id: completed.trackId } });
        if (!track) {
          results.failed.push({
            fileName: file.name,
            error: "Media import completed but the track could not be found.",
            operationId: operation.id,
          });
          continue;
        }
        results.success.push({
          id: track.id,
          title: track.title,
          audioUrl: track.audioUrl,
          mediaType: track.mediaType,
          fileName: file.name,
        });
      } catch (error) {
        const publicError = toPublicUploadError(error);
        results.failed.push({
          fileName: file.name,
          error: publicError.message,
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const publicError = toPublicUploadError(error);
    console.error("Batch upload error:", publicError.code ?? "UNKNOWN");
    return jsonError(publicError.message, publicError.status);
  }
}
