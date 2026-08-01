/**
 * T002 — Disposable desktop test data-root helper.
 *
 * Every W0 spike that needs a writable data root MUST obtain it through this
 * helper so that:
 *   - the root is always an explicit mktemp directory (never the repo runtime);
 *   - the standard desktop layout (database/media/exports/backups/logs/settings)
 *     is created deterministically;
 *   - cleanup is the caller's explicit responsibility (see `dispose()`).
 *
 * This file lives under tests/fixtures/desktop and is owned by the W0-E lane.
 * It must NOT import any production runtime module that reads process.cwd()
 * relative paths or the active prisma/dev.db.
 */
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface DisposableDataRoot {
  /** Absolute data root created under the OS temp dir. */
  root: string;
  /** Absolute path to the SQLite file slot (file may not exist yet). */
  databaseFile: string;
  /** Subdirectories matching AD-003 target layout. */
  dirs: {
    database: string;
    mediaAudio: string;
    mediaVideo: string;
    mediaTemp: string;
    exports: string;
    backups: string;
    logs: string;
    settings: string;
    runtime: string;
  };
  /** Remove the entire data root. Safe to call multiple times. */
  dispose: () => void;
}

const SUBDIRS = [
  "database",
  "media/audio",
  "media/video",
  "media/temp",
  "exports",
  "backups",
  "logs",
  "settings",
  "runtime",
] as const;

/**
 * Create a fresh disposable data root under the OS temp directory.
 * The prefix makes leaked roots greppable: `deeplistener-w0-*`.
 */
export function createDisposableDataRoot(
  prefix = "deeplistener-w0",
): DisposableDataRoot {
  const root = mkdtempSync(join(tmpdir(), `${prefix}-`));
  const dirs = {
    database: join(root, "database"),
    mediaAudio: join(root, "media", "audio"),
    mediaVideo: join(root, "media", "video"),
    mediaTemp: join(root, "media", "temp"),
    exports: join(root, "exports"),
    backups: join(root, "backups"),
    logs: join(root, "logs"),
    settings: join(root, "settings"),
    runtime: join(root, "runtime"),
  } as const;
  for (const sub of SUBDIRS) {
    mkdirSync(join(root, sub), { recursive: true });
  }
  return {
    root,
    databaseFile: join(dirs.database, "deeplistener.db"),
    dirs,
    dispose: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        /* best-effort; caller may also re-run cleanup */
      }
    },
  };
}

/**
 * Build an absolute SQLite file URL for Prisma from a data root.
 * Prisma requires `file:` URLs to be absolute when the working directory is
 * not the schema directory, so this always returns an absolute path.
 */
export function prismaFileUrl(databaseFile: string): string {
  return `file:${databaseFile}`;
}
