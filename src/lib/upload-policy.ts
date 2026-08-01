import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  resolveLayout,
  uploadsDirectory,
  videosDirectory,
  type RuntimeLayout,
} from "./runtime-paths";

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
  /** @deprecated use layout; kept for backward compatibility with existing tests. */
  rootDir?: string;
  mediaKind?: UploadMediaKind;
  /** Explicit runtime layout; defaults to the active resolveLayout(). */
  layout?: RuntimeLayout;
}

/**
 * Resolve the physical media directory for a kind. When `layout` is provided
 * (Desktop explicit root), the media dir lives under <root>/media/{audio|video}.
 * When only the legacy `rootDir` is provided, it resolves <root>/public/{uploads|videos}
 * to preserve Server behavior. When neither is given, the active runtime layout
 * is used (DEEPLISTENER_DATA_DIR → desktop, else cwd → legacy).
 */
function resolveMediaDir(
  mediaKind: UploadMediaKind,
  layout?: RuntimeLayout,
  rootDir?: string,
): string {
  if (rootDir !== undefined) {
    // Legacy/explicit root: keep public/{uploads|videos} shape for Server compat.
    const publicFolder = mediaKind === "VIDEO" ? "videos" : "uploads";
    return path.resolve(rootDir, "public", publicFolder);
  }
  const active = layout ?? resolveLayout();
  return mediaKind === "VIDEO"
    ? videosDirectory(active.root, active.mode)
    : uploadsDirectory(active.root, active.mode);
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
  rootDir,
  mediaKind = "AUDIO",
  layout,
}: BuildUploadTargetOptions) {
  const safeName = sanitizeUploadFilename(originalName);
  const fileName = `${uniqueId}-${safeName}`;
  const publicFolder = mediaKind === "VIDEO" ? "videos" : "uploads";
  const uploadDir = resolveMediaDir(mediaKind, layout, rootDir);
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

export function buildDerivedAudioTarget(videoFileName: string, rootDir?: string, layout?: RuntimeLayout) {
  const baseName = path.parse(videoFileName).name;
  const fileName = `${baseName}.mp3`;
  const uploadDir = resolveMediaDir("AUDIO", layout, rootDir);
  return {
    fileName,
    uploadDir,
    uploadPath: path.resolve(uploadDir, fileName),
    audioUrl: `/uploads/${fileName}`,
  };
}

export function resolveStoredUploadPath(audioUrl: string, rootDir?: string, layout?: RuntimeLayout): string | null {
  if (!audioUrl.startsWith("/uploads/") && !audioUrl.startsWith("uploads/")) return null;

  // Strip the "uploads/" prefix; the media dir is resolved by resolveMediaDir.
  const normalizedUrl = audioUrl.startsWith("/") ? audioUrl.slice(1) : audioUrl;
  const relative = normalizedUrl.replace(/^uploads\//, "");
  if (relative.includes("..") || relative.includes("\\") || relative.includes("\0")) return null;

  const uploadDir = resolveMediaDir("AUDIO", layout, rootDir);
  const resolvedPath = path.resolve(uploadDir, relative);

  if (!resolvedPath.startsWith(`${uploadDir}${path.sep}`)) return null;

  return resolvedPath;
}

export function resolveStoredVideoPath(videoUrl: string, rootDir?: string, layout?: RuntimeLayout): string | null {
  if (!videoUrl.startsWith("/videos/") && !videoUrl.startsWith("videos/")) return null;
  const normalizedUrl = videoUrl.startsWith("/") ? videoUrl.slice(1) : videoUrl;
  const relative = normalizedUrl.replace(/^videos\//, "");
  if (relative.includes("..") || relative.includes("\\") || relative.includes("\0")) return null;
  const videoDir = resolveMediaDir("VIDEO", layout, rootDir);
  const resolvedPath = path.resolve(videoDir, relative);
  return resolvedPath.startsWith(`${videoDir}${path.sep}`) ? resolvedPath : null;
}
