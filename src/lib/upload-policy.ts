import path from "path";
import { v4 as uuidv4 } from "uuid";

export const MAX_AUDIO_UPLOAD_BYTES = 250 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 1024 * 1024 * 1024;
export type UploadMediaKind = "AUDIO" | "VIDEO";

const AUDIO_EXTENSIONS = new Set([
  ".aac",
  ".aif",
  ".aiff",
  ".flac",
  ".m4a",
  ".mp3",
  ".mpeg",
  ".oga",
  ".ogg",
  ".opus",
  ".wav",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

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
  mediaKind?: UploadMediaKind;
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

  const mediaKind = getUploadMediaKind(file);
  if (!mediaKind) {
    return { ok: false, error: "Only audio, MP4, and WebM files are supported" };
  }

  const maximum = mediaKind === "VIDEO" ? MAX_VIDEO_UPLOAD_BYTES : MAX_AUDIO_UPLOAD_BYTES;
  if (file.size > maximum) {
    const maximumLabel = mediaKind === "VIDEO" ? "1GB" : "250MB";
    return { ok: false, error: `File is too large. Maximum size is ${maximumLabel}.` };
  }

  return { ok: true };
}

export function getUploadMediaKind(file: UploadMetadata): UploadMediaKind | null {
  const extension = path.extname(file.name).toLowerCase();
  const mimeType = file.type?.toLowerCase() ?? "";

  if (VIDEO_EXTENSIONS.has(extension) || mimeType === "video/mp4" || mimeType === "video/webm") {
    return "VIDEO";
  }
  if (AUDIO_EXTENSIONS.has(extension) || mimeType.startsWith("audio/")) {
    return "AUDIO";
  }
  return null;
}

export function getMaxUploadBytes(mediaKind: UploadMediaKind): number {
  return mediaKind === "VIDEO" ? MAX_VIDEO_UPLOAD_BYTES : MAX_AUDIO_UPLOAD_BYTES;
}

export function buildUploadTarget({
  originalName,
  uniqueId = uuidv4(),
  rootDir = process.cwd(),
  mediaKind = "AUDIO",
}: BuildUploadTargetOptions) {
  const safeName = sanitizeUploadFilename(originalName);
  const fileName = `${uniqueId}-${safeName}`;
  const publicFolder = mediaKind === "VIDEO" ? "videos" : "uploads";
  const uploadDir = path.resolve(rootDir, "public", publicFolder);
  const uploadPath = path.resolve(uploadDir, fileName);

  if (!uploadPath.startsWith(`${uploadDir}${path.sep}`)) {
    throw new Error("Upload path escapes upload directory");
  }

  return {
    fileName,
    uploadDir,
    uploadPath,
    mediaUrl: `/${publicFolder}/${fileName}`,
    audioUrl: mediaKind === "AUDIO" ? `/uploads/${fileName}` : undefined,
  };
}

export function buildDerivedAudioTarget(videoFileName: string, rootDir = process.cwd()) {
  const baseName = path.parse(videoFileName).name;
  const fileName = `${baseName}.mp3`;
  const uploadDir = path.resolve(rootDir, "public", "uploads");
  return {
    fileName,
    uploadDir,
    uploadPath: path.resolve(uploadDir, fileName),
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

export function resolveStoredVideoPath(videoUrl: string, rootDir = process.cwd()): string | null {
  if (!videoUrl.startsWith("/videos/") && !videoUrl.startsWith("videos/")) return null;
  const normalizedUrl = videoUrl.startsWith("/") ? videoUrl.slice(1) : videoUrl;
  if (normalizedUrl.includes("..") || normalizedUrl.includes("\\")) return null;
  const publicDir = path.resolve(rootDir, "public");
  const resolvedPath = path.resolve(publicDir, normalizedUrl);
  return resolvedPath.startsWith(`${path.resolve(publicDir, "videos")}${path.sep}`) ? resolvedPath : null;
}
