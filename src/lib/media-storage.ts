/**
 * Portable media storage helper (W1 T061 / W2 T113).
 *
 * Resolves stored media URLs (`/uploads/<f>`, `/videos/<f>`) to absolute
 * filesystem paths via the SAME `RuntimeLayout` that `runtime-paths` resolves,
 * validates containment (rejecting traversal and symlink escape through
 * realpath), and reports MIME from the validated extension — never from
 * request input.
 *
 * Design (PDR-002, PDR-003): the stored identifier is the portable
 * `/uploads`- or `/videos`-style URL; the physical directory is resolved from
 * the active data root so the same DB record resolves under any root. Containment
 * is enforced lexically (runtime-paths) AND canonically (realpath) so a symlink
 * planted inside the media directory cannot escape the allowed root.
 */
import { realpath } from "node:fs/promises";
import path from "node:path";
import {
  mediaDirectoryFor,
  resolveLayout,
  resolveStoredMediaPath,
  type RuntimeLayout,
} from "./runtime-paths";

export type MediaKind = "audio" | "video";

/** MIME types served for stored media, keyed by lowercase extension (with dot). */
const MIME_BY_EXTENSION: Record<string, string> = {
  // audio
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".wav": "audio/wav",
  ".wave": "audio/wav",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/opus",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".aif": "audio/aiff",
  ".aiff": "audio/aiff",
  // video
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Default MIME when the extension is unrecognized — served as audio octet-stream. */
export const DEFAULT_AUDIO_MIME = "application/octet-stream";

/**
 * Infer a MIME type from a filename/extension. Pure function; never reads input
 * MIME headers so it cannot be spoofed by request metadata.
 */
export function mimeFromExtension(nameOrPath: string): string {
  const ext = path.extname(nameOrPath).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? DEFAULT_AUDIO_MIME;
}

/** The canonical media directory for a kind under the active layout. */
export function mediaDirectoryForKind(
  kind: MediaKind,
  layout: RuntimeLayout = resolveLayout(),
): string {
  return mediaDirectoryFor(kind, layout.root, layout.mode);
}

/** Outcome of resolving a stored media identifier. */
export type ResolvedMedia =
  | {
      ok: true;
      /** Absolute, contained filesystem path. */
      path: string;
      /** "audio" (uploads) or "video" (videos). */
      kind: MediaKind;
      /** MIME derived from the validated extension. */
      mime: string;
      /** The layout used to resolve the path. */
      layout: RuntimeLayout;
    }
  | { ok: false; reason: "invalid-url" | "not-found" };

/**
 * Resolve a stored media URL to a filesystem path under the active media root,
 * validating containment both lexically (runtime-paths) and canonically
 * (realpath, to reject symlink escape). Does NOT check existence — callers
 * that need existence should use {@link resolveExistingMedia}.
 *
 * Returns the resolved path, kind, and MIME on success, or `{ ok: false }`
 * when the URL is not a recognized stored-media identifier or escapes the
 * allowed root lexically. Symlink-escape is checked in the existence-checking
 * variant because realpath requires the file to exist.
 */
export function resolveMedia(
  storedUrl: string,
  layout: RuntimeLayout = resolveLayout(),
): ResolvedMedia {
  const resolved = resolveStoredMediaPath(storedUrl, layout);
  if (!resolved) {
    return { ok: false, reason: "invalid-url" };
  }
  const kind: MediaKind = storedUrl.includes("/videos/") || storedUrl.startsWith("videos/")
    ? "video"
    : "audio";
  return {
    ok: true,
    path: resolved,
    kind,
    mime: mimeFromExtension(resolved),
    layout,
  };
}

/**
 * Resolve a stored media URL AND validate it exists and stays contained after
 * realpath resolution (PDR-003 symlink-escape rejection). Returns `{ ok: false,
 * reason: "not-found" }` when the file is missing or its canonical path escapes
 * the allowed media directory.
 */
export async function resolveExistingMedia(
  storedUrl: string,
  layout: RuntimeLayout = resolveLayout(),
): Promise<ResolvedMedia> {
  const resolved = resolveMedia(storedUrl, layout);
  if (!resolved.ok) return resolved;

  const dir = mediaDirectoryFor(resolved.kind, layout.root, layout.mode);
  let canonicalFile: string;
  let canonicalDir: string;
  try {
    canonicalFile = await realpath(/* turbopackIgnore: true */ resolved.path);
    // The media directory itself is resolved canonically too, so a symlinked
    // root (e.g. /var -> /private/var on macOS) does not cause false negatives.
    canonicalDir = await realpath(/* turbopackIgnore: true */ dir);
  } catch {
    return { ok: false, reason: "not-found" };
  }

  // Containment after canonicalization: the resolved file must remain beneath
  // the canonical media directory. This rejects symlinks planted inside the
  // media dir that point outside the allowed root.
  const prefix = `${canonicalDir}${path.sep}`;
  if (canonicalFile !== canonicalDir && !canonicalFile.startsWith(prefix)) {
    return { ok: false, reason: "not-found" };
  }

  return resolved;
}
