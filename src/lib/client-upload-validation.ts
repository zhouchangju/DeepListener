/**
 * Client-side pre-validation for media uploads.
 *
 * The server is still the authority (see `src/lib/upload-policy.ts`), but
 * echoing the same rules here means we reject obviously-wrong files before
 * spending seconds/minutes uploading and transcribing them. This mirrors the
 * server's allowed extensions and size caps — keep both lists in sync.
 *
 * Lives in its own module so it can be imported from client components
 * without pulling in the server-side `upload-policy.ts` (which depends on
 * Node `path` and runtime-paths).
 */

const MAX_AUDIO_UPLOAD_BYTES = 250 * 1024 * 1024; // 250MB — matches server.
const MAX_VIDEO_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1GB — matches server.

const AUDIO_EXTENSIONS = new Set([
  ".aac", ".aif", ".aiff", ".flac", ".m4a", ".mp3", ".mp4a", ".oga", ".ogg", ".opus", ".wav", ".weba",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".m4v"]);

export type UploadMediaKind = "AUDIO" | "VIDEO";

export interface ClientUploadValidation {
  ok: boolean;
  /** Stable code so the UI can switch without re-parsing the message. */
  code?: "EMPTY_NAME" | "EMPTY_FILE" | "UNSUPPORTED_TYPE" | "AUDIO_TOO_LARGE" | "VIDEO_TOO_LARGE";
  /** User-facing message (already localized where possible by the caller). */
  message?: string;
  mediaKind?: UploadMediaKind;
}

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function classifyMediaKind(file: { name: string; type?: string }): UploadMediaKind | null {
  const extension = ext(file.name);
  const mimeType = (file.type ?? "").toLowerCase();
  if (VIDEO_EXTENSIONS.has(extension) || mimeType === "video/mp4" || mimeType === "video/webm") {
    return "VIDEO";
  }
  if (AUDIO_EXTENSIONS.has(extension) || mimeType.startsWith("audio/")) {
    return "AUDIO";
  }
  return null;
}

export function validateClientUpload(file: { name: string; size: number; type?: string }): ClientUploadValidation {
  if (!file.name || !file.name.trim()) {
    return { ok: false, code: "EMPTY_NAME", message: "File name is required" };
  }
  if (file.size <= 0) {
    return { ok: false, code: "EMPTY_FILE", message: "File is empty" };
  }
  const mediaKind = classifyMediaKind(file);
  if (!mediaKind) {
    return { ok: false, code: "UNSUPPORTED_TYPE", message: "Only audio, MP4, and WebM files are supported" };
  }
  const maximum = mediaKind === "VIDEO" ? MAX_VIDEO_UPLOAD_BYTES : MAX_AUDIO_UPLOAD_BYTES;
  if (file.size > maximum) {
    const maximumLabel = mediaKind === "VIDEO" ? "1GB" : "250MB";
    return {
      ok: false,
      code: mediaKind === "VIDEO" ? "VIDEO_TOO_LARGE" : "AUDIO_TOO_LARGE",
      message: `File is too large. Maximum size is ${maximumLabel}.`,
      mediaKind,
    };
  }
  return { ok: true, mediaKind };
}
