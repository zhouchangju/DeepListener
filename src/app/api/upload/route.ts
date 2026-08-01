import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { mkdir, rename, unlink } from "fs/promises";
import { Readable, Transform } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { pipeline } from "stream/promises";
import { prisma } from "@/lib/prisma";
import { getTranscriptionProvider } from "@/lib/transcription/factory";
import type { TranscriptionProvider } from "@/lib/transcription/types";
import {
  buildDerivedAudioTarget,
  buildUploadTarget,
  getMaxUploadBytes,
  getUploadMediaKind,
  validateUploadFileMetadata,
} from "@/lib/upload-policy";
import { extractAudioFromVideo, readEmbeddedSubtitles } from "@/lib/media-processing";
import { badRequest, jsonError } from "@/lib/api-response";
import { toPublicUploadError } from "@/lib/upload-error";

export const maxDuration = 900;

/**
 * Wrap a transcription call with a timeout. Provider SDKs can hang on
 * network stalls; without a cap the request runs until the platform kills
 * it at maxDuration, leaving the uploaded files orphaned on disk (the catch
 * block never runs because the process is killed). Rejecting early lets the
 * normal error path clean up the partial files.
 */
const TRANSCRIPTION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

async function transcribeWithTimeout(
  provider: TranscriptionProvider,
  audioPath: string
): Promise<Awaited<ReturnType<TranscriptionProvider["transcribe"]>>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Transcription timed out. The provider did not respond in time.")),
      TRANSCRIPTION_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([
      provider.transcribe(audioPath),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

interface UploadSource {
  name: string;
  type?: string;
  size: number;
  stream: ReadableStream<Uint8Array>;
}

async function removeFile(filePath: string | null) {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    // The original processing error is more useful than a cleanup failure.
  }
}

async function streamFileToDisk(source: UploadSource, targetPath: string, maximumBytes: number) {
  const partialPath = `${targetPath}.part`;
  let bytesWritten = 0;
  const byteLimit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesWritten += chunk.length;
      if (bytesWritten > maximumBytes) {
        callback(new Error("File exceeded the allowed size while uploading"));
        return;
      }
      callback(null, chunk);
    },
  });
  try {
    const output = createWriteStream(partialPath, { flags: "wx" });
    await pipeline(
      Readable.fromWeb(source.stream as unknown as NodeReadableStream<Uint8Array>),
      byteLimit,
      output,
    );
    await rename(partialPath, targetPath);
  } catch (error) {
    await removeFile(partialPath);
    throw error;
  }
}

async function processFile(file: UploadSource, provider: TranscriptionProvider) {
  const validation = validateUploadFileMetadata(file);
  if (!validation.ok) throw new Error(validation.error ?? "Invalid upload");

  const mediaType = getUploadMediaKind(file);
  if (!mediaType) throw new Error("Unsupported media type");

  const mediaTarget = buildUploadTarget({ originalName: file.name, mediaKind: mediaType });
  const derivedAudioTarget = mediaType === "VIDEO"
    ? buildDerivedAudioTarget(mediaTarget.fileName)
    : null;
  let sourceWritten = false;

  try {
    await mkdir(mediaTarget.uploadDir, { recursive: true });
    await streamFileToDisk(file, mediaTarget.uploadPath, getMaxUploadBytes(mediaType));
    sourceWritten = true;

    if (derivedAudioTarget) {
      await mkdir(derivedAudioTarget.uploadDir, { recursive: true });
      await extractAudioFromVideo(mediaTarget.uploadPath, derivedAudioTarget.uploadPath);
    }

    const audioPath = derivedAudioTarget?.uploadPath ?? mediaTarget.uploadPath;
    const audioUrl = derivedAudioTarget?.audioUrl ?? mediaTarget.audioUrl;
    if (!audioUrl) throw new Error("Audio preparation failed");

    const embeddedSubtitles = mediaType === "VIDEO"
      ? await readEmbeddedSubtitles(mediaTarget.uploadPath)
      : null;
    const transcription = embeddedSubtitles ?? await transcribeWithTimeout(provider, audioPath);

    return await prisma.track.create({
      data: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        audioUrl,
        mediaType,
        videoUrl: mediaType === "VIDEO" ? mediaTarget.mediaUrl : null,
        transcription: transcription.rawJson,
        status: "UNLEARNT",
        sentences: {
          create: transcription.segments.map((segment, index) => ({
            text: segment.text,
            startTime: segment.start,
            endTime: segment.end,
            orderIndex: index,
          })),
        },
      },
      include: { sentences: true },
    });
  } catch (error) {
    await removeFile(derivedAudioTarget?.uploadPath ?? null);
    if (sourceWritten) await removeFile(mediaTarget.uploadPath);
    throw error;
  }
}

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
    const file: UploadSource = {
      name,
      type: req.headers.get("content-type") ?? undefined,
      size,
      stream: req.body,
    };

    const track = await processFile(file, getTranscriptionProvider());
    return NextResponse.json(track);
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const publicError = toPublicUploadError(error);
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

    const provider = getTranscriptionProvider();
    const results = {
      success: [] as Array<{ id: string; title: string; audioUrl: string; mediaType: string; fileName: string }>,
      failed: [] as Array<{ fileName: string; error: string }>,
    };

    for (const file of files) {
      try {
        const track = await processFile({
          name: file.name,
          type: file.type,
          size: file.size,
          stream: file.stream(),
        }, provider);
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
    console.error("Batch upload error:", error);
    const publicError = toPublicUploadError(error);
    return jsonError(publicError.message, publicError.status);
  }
}
