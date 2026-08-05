import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, rename, stat, statfs, unlink } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { buildUploadTarget, getMaxUploadBytes, getUploadMediaKind, sanitizeUploadFilename, validateUploadFileMetadata, type UploadMediaKind } from "@/lib/upload-policy";
import { resolveLayout, type RuntimeLayout } from "@/lib/runtime-paths";
import { importJobStagingDirectory, resolveArtifactPath } from "./manifest";
import type { ImportArtifact, ImportJobManifest } from "./types";

export interface ImportUploadSource {
  name: string;
  type?: string;
  size: number;
  stream: ReadableStream<Uint8Array>;
}

const MAX_SUBTITLE_BYTES = 10 * 1024 * 1024;

export function classifyMedia(source: Pick<ImportUploadSource, "name" | "type" | "size">): UploadMediaKind {
  const validation = validateUploadFileMetadata(source);
  if (!validation.ok) throw new Error(validation.error ?? "Invalid media upload");
  const kind = getUploadMediaKind(source);
  if (!kind) throw new Error("Unsupported media type");
  return kind;
}

export async function stageUploadSource(
  source: ImportUploadSource,
  operationId: string,
  layout: RuntimeLayout = resolveLayout(),
): Promise<{ mediaKind: UploadMediaKind; artifact: ImportArtifact }> {
  const mediaKind = classifyMedia(source);
  if (!(await hasSufficientImportSpace(importJobStagingDirectory(operationId, layout), source.size))) {
    throw new Error("Not enough free disk space to stage this media file");
  }
  const safeName = sanitizeUploadFilename(source.name);
  const storageKey = `source/${safeName}`;
  const stagingRoot = importJobStagingDirectory(operationId, layout);
  const target = path.join(stagingRoot, storageKey);
  const bytesWritten = await writeStreamAtomically(source.stream, target, getMaxUploadBytes(mediaKind));
  if (bytesWritten !== source.size) {
    await unlink(target).catch(() => undefined);
    throw new Error("Uploaded media size did not match its declared size");
  }
  const info = await stat(target);
  return {
    mediaKind,
    artifact: { kind: "source", storageKey, bytes: info.size, sha256: await sha256(target), originalName: source.name },
  };
}

export async function stageSubtitle(
  source: ImportUploadSource,
  manifest: ImportJobManifest,
  layout: RuntimeLayout = resolveLayout(),
): Promise<ImportArtifact> {
  const extension = path.extname(source.name).toLowerCase();
  if (extension !== ".srt" && extension !== ".vtt") throw new Error("Subtitle must be an .srt or .vtt file");
  if (!Number.isSafeInteger(source.size) || source.size <= 0 || source.size > MAX_SUBTITLE_BYTES) {
    throw new Error("Subtitle file is empty or too large");
  }
  // Keep replacements isolated from a previously attached subtitle. Writing
  // directly to the old key would let a malformed replacement overwrite the
  // valid sidecar before validation finishes.
  const storageKey = `subtitle/${randomUUID()}-${sanitizeUploadFilename(source.name)}`;
  const target = path.join(importJobStagingDirectory(manifest.id, layout), storageKey);
  const bytesWritten = await writeStreamAtomically(source.stream, target, MAX_SUBTITLE_BYTES);
  if (bytesWritten !== source.size) {
    await unlink(target).catch(() => undefined);
    throw new Error("Uploaded subtitle size did not match its declared size");
  }
  const info = await stat(target);
  return { kind: "subtitle", storageKey, bytes: info.size, sha256: await sha256(target), originalName: source.name };
}

export async function promoteArtifact(
  manifest: ImportJobManifest,
  artifact: ImportArtifact,
  layout: RuntimeLayout = resolveLayout(),
): Promise<{ url: string; path: string }> {
  const sourcePath = resolveArtifactPath(manifest, artifact, layout);
  const source = await stat(sourcePath);
  if (!source.isFile()) throw new Error("Import artifact is not a file");
  const originalName = artifact.originalName ?? path.basename(artifact.storageKey);
  const target = buildUploadTarget({
    originalName,
    uniqueId: manifest.id,
    mediaKind: manifest.mediaKind,
    layout,
  });
  await mkdir(target.uploadDir, { recursive: true });
  // Copy instead of moving while activation is still provisional. If the
  // database write fails after media promotion, the operation can be retried
  // from its owned staging directory without asking the learner to upload the
  // source again. The staging directory is removed only after the manifest is
  // durably marked ACTIVATED.
  if (!(await isFile(target.uploadPath))) await copyOrKeep(sourcePath, target.uploadPath);
  return { url: manifest.mediaKind === "VIDEO" ? target.mediaUrl : target.audioUrl ?? target.mediaUrl, path: target.uploadPath };
}

export async function promoteDerivedAudio(
  manifest: ImportJobManifest,
  artifact: ImportArtifact,
  layout: RuntimeLayout = resolveLayout(),
): Promise<{ url: string; path: string }> {
  const sourcePath = resolveArtifactPath(manifest, artifact, layout);
  const target = buildUploadTarget({
    originalName: `${manifest.displayName}.mp3`,
    uniqueId: manifest.id,
    mediaKind: "AUDIO",
    layout,
  });
  await mkdir(target.uploadDir, { recursive: true });
  if (!(await isFile(target.uploadPath))) await copyOrKeep(sourcePath, target.uploadPath);
  return { url: target.audioUrl ?? `/uploads/${target.fileName}`, path: target.uploadPath };
}

async function writeStreamAtomically(stream: ReadableStream<Uint8Array>, target: string, maximumBytes: number): Promise<number> {
  await mkdir(path.dirname(target), { recursive: true });
  const partial = `${target}.part`;
  let bytesWritten = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesWritten += chunk.length;
      if (bytesWritten > maximumBytes) return callback(new Error("File exceeded the allowed size while uploading"));
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(stream as unknown as NodeReadableStream<Uint8Array>),
      limiter,
      createWriteStream(partial, { flags: "wx" }),
    );
    await rename(partial, target);
    return bytesWritten;
  } catch (error) {
    await unlink(partial).catch(() => undefined);
    throw error;
  }
}

async function copyOrKeep(source: string, target: string): Promise<void> {
  // The target is operation-ID derived and therefore cannot collide with a
  // pre-existing user upload. Keep the explicit existence check above so a
  // retry reuses a completed promotion without rewriting it.
  await copyFile(source, target, constants.COPYFILE_EXCL);
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function sha256(filePath: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export { MAX_SUBTITLE_BYTES };

/** Keep a small reserve so a successful upload can still write its manifest and derived audio. */
export function hasSufficientSpace(freeBytes: number, requiredBytes: number, reserveBytes = 32 * 1024 * 1024): boolean {
  return Number.isFinite(freeBytes) && Number.isFinite(requiredBytes) && requiredBytes >= 0 && freeBytes >= requiredBytes + reserveBytes;
}

export async function hasSufficientImportSpace(directory: string, requiredBytes: number): Promise<boolean> {
  for (const candidate of [directory, path.dirname(directory), path.dirname(path.dirname(directory))]) {
    try {
      const info = await statfs(candidate);
      const freeBytes = Number(info.bavail) * Number(info.bsize);
      return hasSufficientSpace(freeBytes, requiredBytes);
    } catch {
      // Probe the nearest existing parent on platforms that reject statfs for
      // a not-yet-created operation directory.
    }
  }
  // The streaming size guard remains authoritative if no parent can be probed.
  return true;
}
