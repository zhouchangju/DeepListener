import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { resolveLayout, type RuntimeLayout } from "@/lib/runtime-paths";
import { sanitizeUploadFilename } from "@/lib/upload-policy";
import { parseSubtitle, validateSubtitleMatch } from "@/lib/subtitle-utils";
import { readMediaDuration } from "@/lib/media-processing";
import { toPublicUploadError } from "@/lib/upload-error";
import { importJobStagingDirectory, createOperationId, readManifest, writeManifest } from "./manifest";
import { stageSubtitle, stageUploadSource, type ImportUploadSource } from "./staging";
import type { ImportJobManifest, PublicImportJob } from "./types";
import { toPublicImportJob } from "./manifest";
import { ImportJobError } from "./run";

export async function createImportJob(
  source: ImportUploadSource,
  layout: RuntimeLayout = resolveLayout(),
): Promise<PublicImportJob> {
  const id = createOperationId();
  const now = new Date().toISOString();
  const displayName = path.parse(sanitizeUploadFilename(source.name)).name || "Untitled import";
  const kind = source.name.toLowerCase().endsWith(".mp4") || source.name.toLowerCase().endsWith(".webm") || source.type?.startsWith("video/")
    ? "VIDEO"
    : "AUDIO";
  const initial: ImportJobManifest = {
    version: 1,
    id,
    status: "RECEIVING",
    mediaKind: kind,
    displayName,
    originalName: source.name,
    createdAt: now,
    updatedAt: now,
    phase: "received",
    artifacts: [],
    estimatedBytes: source.size,
  };
  await writeManifest(initial, layout);
  try {
    const staged = await stageUploadSource(source, id, layout);
    return toPublicImportJob(await writeManifest({
      ...initial,
      mediaKind: staged.mediaKind,
      status: "READY",
      phase: "received",
      artifacts: [staged.artifact],
    }, layout));
  } catch (error) {
    await rm(importJobStagingDirectory(id, layout), { recursive: true, force: true }).catch(() => undefined);
    const safe = toPublicUploadError(error);
    await writeManifest({
      ...initial,
      status: "FAILED",
      phase: "failed",
      error: {
        code: "IMPORT_FAILED",
        message: safe.message,
        occurredAt: new Date().toISOString(),
      },
    }, layout).catch(() => undefined);
    throw error;
  }
}

export async function attachImportSubtitle(
  operationId: string,
  source: ImportUploadSource,
  layout: RuntimeLayout = resolveLayout(),
): Promise<PublicImportJob> {
  const manifest = await readManifest(operationId, layout);
  if (!manifest) throw new ImportJobError("IMPORT_FAILED", "Import operation was not found.");
  if (manifest.status === "ACTIVATED" || manifest.status === "CANCELED") {
    throw new ImportJobError("IMPORT_FAILED", "This import can no longer accept a subtitle.");
  }
  if (manifest.status === "TRANSCRIBING" || manifest.status === "ACTIVATING") {
    throw new ImportJobError("IMPORT_FAILED", "This import is currently being processed.");
  }
  const artifact = await stageSubtitle(source, manifest, layout);
  const extension = path.extname(source.name).toLowerCase();
  const format = extension === ".vtt" ? "vtt" : "srt";
  try {
    const raw = await readFile(path.join(importJobStagingDirectory(operationId, layout), artifact.storageKey), "utf8");
    const segments = parseSubtitle(raw, format);
    const sourceArtifact = manifest.artifacts.find((item) => item.kind === "source");
    const duration = sourceArtifact
      ? await readMediaDuration(path.join(importJobStagingDirectory(operationId, layout), sourceArtifact.storageKey))
      : null;
    const match = validateSubtitleMatch(segments, duration ?? undefined);
    if (!match.ok) throw new ImportJobError("SUBTITLE_MISMATCH", "The subtitle timings do not match this media file.");
    const next = await writeManifest({
      ...manifest,
      status: "READY",
      phase: "subtitle-ready",
      subtitleFormat: format,
      artifacts: [...manifest.artifacts.filter((item) => item.kind !== "subtitle"), artifact],
      error: undefined,
    }, layout);
    return toPublicImportJob(next);
  } catch (error) {
    await rm(path.join(importJobStagingDirectory(operationId, layout), artifact.storageKey), { force: true }).catch(() => undefined);
    throw error;
  }
}
