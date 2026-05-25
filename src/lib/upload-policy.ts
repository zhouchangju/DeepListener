import path from "path";
import { v4 as uuidv4 } from "uuid";

export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

const AUDIO_EXTENSIONS = new Set([
  ".aac",
  ".aif",
  ".aiff",
  ".flac",
  ".m4a",
  ".mp3",
  ".mp4",
  ".mpeg",
  ".oga",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
]);

interface UploadMetadata {
  name: string;
  type?: string;
  size: number;
}

interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

interface BuildUploadTargetOptions {
  originalName: string;
  uniqueId?: string;
  rootDir?: string;
}

export function sanitizeUploadFilename(originalName: string): string {
  const sanitized = originalName
    .replace(/[\/\\\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._()-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\-]+/, "")
    .replace(/[.\-]+$/, "");

  return sanitized || "audio-upload";
}

export function validateUploadFileMetadata(file: UploadMetadata): UploadValidationResult {
  if (!file.name || !file.name.trim()) {
    return { ok: false, error: "File name is required" };
  }

  if (file.size <= 0) {
    return { ok: false, error: "File is empty" };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is too large. Maximum size is 250MB." };
  }

  const extension = path.extname(file.name).toLowerCase();
  const hasAudioExtension = AUDIO_EXTENSIONS.has(extension);
  const hasAudioMimeType = Boolean(file.type?.toLowerCase().startsWith("audio/"));

  if (!hasAudioExtension && !hasAudioMimeType) {
    return { ok: false, error: "Only audio files are supported" };
  }

  return { ok: true };
}

export function buildUploadTarget({
  originalName,
  uniqueId = uuidv4(),
  rootDir = process.cwd(),
}: BuildUploadTargetOptions) {
  const safeName = sanitizeUploadFilename(originalName);
  const fileName = `${uniqueId}-${safeName}`;
  const uploadDir = path.resolve(rootDir, "public", "uploads");
  const uploadPath = path.resolve(uploadDir, fileName);

  if (!uploadPath.startsWith(`${uploadDir}${path.sep}`)) {
    throw new Error("Upload path escapes upload directory");
  }

  return {
    fileName,
    uploadDir,
    uploadPath,
    audioUrl: `/uploads/${fileName}`,
  };
}

export function resolveStoredUploadPath(audioUrl: string, rootDir = process.cwd()): string | null {
  if (!audioUrl.startsWith("/uploads/") && !audioUrl.startsWith("uploads/")) return null;

  const normalizedUrl = audioUrl.startsWith("/") ? audioUrl.slice(1) : audioUrl;
  if (normalizedUrl.includes("..") || normalizedUrl.includes("\\")) return null;

  const publicDir = path.resolve(rootDir, "public");
  const resolvedPath = path.resolve(publicDir, normalizedUrl);

  if (!resolvedPath.startsWith(`${publicDir}${path.sep}`)) return null;

  return resolvedPath;
}
