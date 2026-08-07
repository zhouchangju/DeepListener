/**
 * Runtime path resolver (W1 T060 / W2 T110).
 *
 * Single source of truth for every mutable path in DeepListener. Resolves an
 * explicit writable data root when `DEEPLISTENER_DATA_DIR` is set (Desktop),
 * and falls back to the legacy repository-relative layout (Server) when it is
 * not — so Server behavior is byte-identical unless an explicit root is given.
 *
 * Design (AD-003): database, media, backups, logs, settings, and runtime
 * state all resolve beneath one root. Packaged application resources
 * are treated as read-only.
 */
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

export type RuntimeMode = "desktop" | "legacy";

/**
 * Minimal env shape: anything with a string-or-undefined `DEEPLISTENER_DATA_DIR`.
 * Broad enough to accept NodeJS.ProcessEnv and the Readonly<Record> used by
 * tests/setup-readiness without forcing callers to construct a full ProcessEnv.
 */
export type EnvLike = { DEEPLISTENER_DATA_DIR?: string } & Record<string, string | undefined>;

export interface RuntimeLayout {
  /** The active data root (absolute). */
  root: string;
  /** "desktop" = explicit DEEPLISTENER_DATA_DIR; "legacy" = cwd fallback. */
  mode: RuntimeMode;
}

/** Explicit data root configured via env, or null for legacy layout. */
function configuredDataRoot(env: EnvLike = process.env): string | null {
  const raw = env.DEEPLISTENER_DATA_DIR;
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  // Reject relative values BEFORE resolving — a relative root would silently
  // re-couple to the working directory, defeating the decoupling purpose.
  if (!path.isAbsolute(trimmed)) {
    throw new Error(
      `DEEPLISTENER_DATA_DIR must be an absolute path (got "${raw}").`,
    );
  }
  return path.resolve(trimmed);
}

/**
 * Resolve the active runtime layout (root + mode) from env.
 *
 * - Desktop: `DEEPLISTENER_DATA_DIR` points at the OS user-data directory.
 * - Server (legacy): falls back to `process.cwd()` so `prisma/dev.db` and
 *   `public/uploads` keep resolving exactly as before.
 *
 * Throws if an explicit root is configured but is not absolute (Prisma +
 * security require an unambiguous root; a relative value would silently
 * re-couple to the working directory).
 */
export function resolveLayout(
  env: EnvLike = process.env,
  cwd: string = process.cwd(),
): RuntimeLayout {
  const explicit = configuredDataRoot(env);
  if (explicit) {
    return { root: explicit, mode: "desktop" };
  }
  return { root: cwd, mode: "legacy" };
}

/** Resolve the active data root. */
export function resolveDataRoot(
  env: EnvLike = process.env,
  cwd: string = process.cwd(),
): string {
  return resolveLayout(env, cwd).root;
}

/** Whether the explicit Desktop data root is in use (vs legacy Server layout). */
export function isExplicitDataRoot(env: EnvLike = process.env): boolean {
  return resolveLayout(env).mode === "desktop";
}

/** The directory holding the SQLite database file. */
export function databaseDirectory(root: string, mode: RuntimeMode): string {
  // Legacy: Prisma resolves `file:./dev.db` relative to schema.prisma → prisma/dev.db.
  // Desktop: database/deeplistener.db under the data root.
  return mode === "desktop"
    ? path.join(root, "database")
    : path.join(root, "prisma");
}

/** Absolute path to the SQLite database file. */
export function databaseFile(root: string, mode: RuntimeMode): string {
  return mode === "desktop"
    ? path.join(databaseDirectory(root, mode), "deeplistener.db")
    : path.join(databaseDirectory(root, mode), "dev.db");
}

/** Prisma `file:` URL for the resolved database (absolute). */
export function databaseUrl(layout: RuntimeLayout = resolveLayout()): string {
  return `file:${databaseFile(layout.root, layout.mode)}`;
}

/** The directory holding uploaded audio (and video-derived audio). */
export function uploadsDirectory(root: string, mode: RuntimeMode): string {
  return mode === "desktop"
    ? path.join(root, "media", "audio")
    : path.join(root, "public", "uploads");
}

/** The directory holding original local videos. */
export function videosDirectory(root: string, mode: RuntimeMode): string {
  return mode === "desktop"
    ? path.join(root, "media", "video")
    : path.join(root, "public", "videos");
}

/** The directory for transient import/operation artifacts. */
export function mediaTempDirectory(root: string, mode: RuntimeMode): string {
  return mode === "desktop"
    ? path.join(root, "media", "temp")
    : path.join(root, "public", "uploads", ".tmp");
}

/** The directory holding backups. */
export function backupsDirectory(root: string): string {
  return path.join(root, "backups");
}

/** The directory holding logs. */
export function logsDirectory(root: string): string {
  return path.join(root, "logs");
}

/** The directory holding non-secret settings. */
export function settingsDirectory(root: string): string {
  return path.join(root, "settings");
}

/** Absolute path to the versioned, non-secret settings document. */
export function settingsFile(root: string): string {
  return path.join(settingsDirectory(root), "settings.json");
}

/**
 * The secrets file holding transcription provider credentials entered via the
 * desktop UI. Lives under the settings directory so it inherits the data-root
 * resolution (desktop = user-data dir, legacy = cwd). Never committed.
 */
export function secretsFile(root: string): string {
  return path.join(settingsDirectory(root), "secrets.json");
}

/** The directory holding runtime state (e.g. migration-state.json). */
export function runtimeStateDirectory(root: string): string {
  return path.join(root, "runtime");
}

/**
 * Canonical media kind → directory, used by upload-policy and the media route.
 * "audio" maps to uploads; "video" maps to videos.
 */
export function mediaDirectoryFor(
  kind: "audio" | "video",
  root: string,
  mode: RuntimeMode,
): string {
  return kind === "video"
    ? videosDirectory(root, mode)
    : uploadsDirectory(root, mode);
}

/**
 * Resolve a legacy stored URL (`/uploads/<file>` or `/videos/<file>`) to an
 * absolute filesystem path under the active media root, rejecting traversal.
 * Returns null if the URL is not a recognized stored-media URL or escapes.
 */
export function resolveStoredMediaPath(
  storedUrl: string,
  layout: RuntimeLayout = resolveLayout(),
): string | null {
  if (typeof storedUrl !== "string" || !storedUrl) return null;
  const match = /^\/?(uploads|videos)\/(.+)$/.exec(storedUrl);
  if (!match) return null;
  const [, kind, relative] = match;
  // Reject traversal attempts before touching the filesystem.
  if (relative.includes("..") || relative.includes("\\") || relative.includes("\0")) {
    return null;
  }
  const dir = mediaDirectoryFor(kind === "uploads" ? "audio" : "video", layout.root, layout.mode);
  // Runtime media belongs to the user's writable data root and must never be
  // pulled into Next's standalone output-file trace.
  const resolved = path.resolve(/* turbopackIgnore: true */ dir, relative);
  // Containment check: resolved path must stay under the media directory.
  if (!resolved.startsWith(`${dir}${path.sep}`) && resolved !== dir) {
    return null;
  }
  return resolved;
}

/** Ensure a directory exists and is writable. Throws on failure. */
export async function ensureWritableDir(dir: string): Promise<void> {
  await access(path.dirname(dir), constants.W_OK).catch(() => {
    throw new Error(`Parent of ${dir} is not writable.`);
  });
  // mkdir is done by callers; here we only validate writability.
  try {
    await access(dir, constants.W_OK);
  } catch {
    // dir may not exist yet; that's acceptable as long as the parent is writable.
  }
}

/** A redacted summary of the active runtime layout (no secrets, no user data). */
export function redactedRuntimeSummary(layout: RuntimeLayout = resolveLayout()): {
  dataRoot: string;
  explicit: boolean;
  databaseFile: string;
  uploadsDirectory: string;
  videosDirectory: string;
} {
  return {
    dataRoot: layout.root,
    explicit: layout.mode === "desktop",
    databaseFile: databaseFile(layout.root, layout.mode),
    uploadsDirectory: uploadsDirectory(layout.root, layout.mode),
    videosDirectory: videosDirectory(layout.root, layout.mode),
  };
}
