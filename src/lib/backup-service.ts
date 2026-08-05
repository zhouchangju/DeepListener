/**
 * Manifest-backed, portable Desktop backup and restore primitives.
 *
 * This module deliberately operates on an explicit RuntimeLayout rather than
 * importing the active Prisma client. That makes every test disposable and
 * keeps restore ownership outside the repository's live data root. Backups are
 * directory bundles (not opaque archives) so a user or support tool can
 * inspect the manifest without extracting untrusted bytes first:
 *
 *   <bundle>/manifest.json
 *   <bundle>/database/deeplistener.db
 *   <bundle>/media/audio/...
 *   <bundle>/media/video/...
 *
 * The manifest contains only relative POSIX storage keys, sizes, and SHA-256
 * checksums. Settings, secrets, logs, exports, and absolute source paths are
 * intentionally excluded.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  databaseFile,
  mediaDirectoryFor,
  type RuntimeLayout,
} from "./runtime-paths";

export const BACKUP_FORMAT = "deeplistener-backup" as const;
export const BACKUP_VERSION = 1 as const;
export const BACKUP_MANIFEST_NAME = "manifest.json" as const;

export type BackupEntryKind = "database" | "audio" | "video";

export interface BackupFileEntry {
  /** POSIX path relative to the bundle root; never an absolute path. */
  path: string;
  kind: BackupEntryKind;
  size: number;
  sha256: string;
  required: boolean;
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  /** Optional semver supplied by the caller; never a filesystem path. */
  appVersion?: string;
  /** The source layout is intentionally categorical, not path-bearing. */
  sourceMode: RuntimeLayout["mode"];
  files: BackupFileEntry[];
}

export type BackupResult =
  | { ok: true; backupPath: string; manifest: BackupManifest }
  | { ok: false; reason: BackupFailureReason };

export type BackupFailureReason =
  | "source-database-missing"
  | "source-not-readable"
  | "destination-exists"
  | "destination-invalid"
  | "copy-failed"
  | "manifest-invalid"
  | "integrity-failed"
  | "sqlite-check-failed";

export type BackupValidation =
  | { ok: true; manifest: BackupManifest }
  | { ok: false; reason: BackupFailureReason };

export interface CreateBackupInput {
  source: RuntimeLayout;
  /** Must be an absolute path that does not already exist. */
  destination: string;
  appVersion?: string;
}

export interface StageRestoreInput {
  /** Absolute path to a previously-created backup bundle. */
  backupPath: string;
  /** Absolute path to the intended Desktop data root. */
  targetRoot: string;
}

export interface RestoreStage {
  stagingPath: string;
  targetRoot: string;
  manifest: BackupManifest;
  conflicts: string[];
}

export type StageRestoreResult =
  | { ok: true; stage: RestoreStage; status: "staged" | "conflict" }
  | { ok: false; reason: BackupFailureReason | "target-invalid" | "stage-failed" };

export type ActivateRestoreResult =
  | {
      ok: true;
      targetRoot: string;
      /** Sibling directory containing the previous root for rollback. */
      previousRoot?: string;
      manifest: BackupManifest;
    }
  | {
      ok: false;
      reason:
        | BackupFailureReason
        | "target-invalid"
        | "stage-invalid"
        | "confirmation-required"
        | "activation-failed";
      stagingPath?: string;
      conflicts?: string[];
    };

const SHA256_RE = /^[a-f0-9]{64}$/;
const MAX_MANIFEST_ENTRIES = 20_000;
const MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024 * 1024; // 20 GiB safety bound

function isAbsolute(value: string): boolean {
  return typeof value === "string" && path.isAbsolute(value);
}

function toPosixRelative(value: string): string {
  return value.split(path.sep).join("/").replace(/\\/g, "/");
}

/** Reject absolute, traversal, drive-letter, backslash, and empty keys. */
function isSafeBundlePath(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0")) {
    return false;
  }
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function containedPath(root: string, relative: string): string | null {
  if (!isSafeBundlePath(relative)) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, ...relative.split("/"));
  const prefix = `${resolvedRoot}${path.sep}`;
  return resolved === resolvedRoot || resolved.startsWith(prefix) ? resolved : null;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath: string): Promise<{ size: number; sha256: string }> {
  const digest = createHash("sha256");
  let size = 0;
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      digest.update(bytes);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return { size, sha256: digest.digest("hex") };
}

async function canonicalContained(filePath: string, root: string): Promise<boolean> {
  try {
    const [canonicalFile, canonicalRoot] = await Promise.all([realpath(filePath), realpath(root)]);
    const relative = path.relative(canonicalRoot, canonicalFile);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  } catch {
    return false;
  }
}

async function collectFiles(
  directory: string,
  kind: Exclude<BackupEntryKind, "database">,
  prefix: string,
): Promise<Array<{ sourcePath: string; bundlePath: string; kind: BackupEntryKind }>> {
  if (!(await exists(directory))) return [];
  const output: Array<{ sourcePath: string; bundlePath: string; kind: BackupEntryKind }> = [];

  async function visit(current: string, relative = ""): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      // Import staging and temporary sidecars are not user media and must not
      // become part of a portable backup.
      if (entry.name === ".tmp" || entry.name.startsWith(".staging-")) continue;
      const sourcePath = path.join(current, entry.name);
      const relativePath = relative ? path.join(relative, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (!(await canonicalContained(sourcePath, directory))) {
          throw new Error("media-symlink-escape");
        }
        await visit(sourcePath, relativePath);
        continue;
      }
      const info = await lstat(sourcePath);
      if (!info.isFile() && !info.isSymbolicLink()) continue;
      if (!(await canonicalContained(sourcePath, directory))) {
        throw new Error("media-symlink-escape");
      }
      output.push({
        sourcePath,
        bundlePath: `${prefix}/${toPosixRelative(relativePath)}`,
        kind,
      });
    }
  }

  await visit(directory);
  return output;
}

/** Copy one file while retaining the caller-provided portable path/kind. */
async function copyEntry(
  sourcePath: string,
  destinationRoot: string,
  entry: Pick<BackupFileEntry, "path" | "kind" | "required">,
): Promise<BackupFileEntry> {
  const sourceInfo = await stat(sourcePath);
  if (!sourceInfo.isFile() || sourceInfo.size > MAX_SINGLE_FILE_BYTES) {
    throw new Error("file-invalid");
  }
  const sourceHash = await hashFile(sourcePath);
  const target = containedPath(destinationRoot, entry.path);
  if (!target) throw new Error("bundle-path-invalid");
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(sourcePath, target);
  const copiedHash = await hashFile(target);
  if (sourceHash.size !== copiedHash.size || sourceHash.sha256 !== copiedHash.sha256) {
    throw new Error("copy-integrity");
  }
  return { ...entry, size: sourceHash.size, sha256: sourceHash.sha256 };
}

function safeReason(error: unknown): BackupFailureReason {
  const code = error instanceof Error ? error.message : "";
  if (code === "media-symlink-escape" || code === "file-invalid") return "source-not-readable";
  if (code === "copy-integrity") return "integrity-failed";
  if (code === "sqlite-check") return "sqlite-check-failed";
  if (code === "bundle-path-invalid" || code === "manifest-shape" || code === "manifest-invalid") return "manifest-invalid";
  if (code === "source-not-readable") return "source-not-readable";
  if (code === "integrity-failed") return "integrity-failed";
  if (code === "sqlite-check-failed") return "sqlite-check-failed";
  return "copy-failed";
}

/** Run SQLite's quick_check without importing Prisma or touching the active DB. */
export async function sqliteIntegrityOk(dbFilePath: string): Promise<boolean> {
  try {
    const mod = (await import("node:sqlite")) as {
      DatabaseSync: new (location: string) => {
        prepare(sql: string): { get(): unknown };
        close(): void;
      };
    };
    const db = new mod.DatabaseSync(dbFilePath);
    try {
      const row = db.prepare("PRAGMA quick_check").get() as { quick_check?: unknown } | undefined;
      return row?.quick_check === "ok";
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

function validateManifestShape(input: unknown): input is BackupManifest {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const candidate = input as Record<string, unknown>;
  if (candidate.format !== BACKUP_FORMAT || candidate.version !== BACKUP_VERSION) return false;
  if (typeof candidate.createdAt !== "string" || !Number.isFinite(Date.parse(candidate.createdAt))) return false;
  if (candidate.sourceMode !== "desktop" && candidate.sourceMode !== "legacy") return false;
  if (!Array.isArray(candidate.files) || candidate.files.length === 0 || candidate.files.length > MAX_MANIFEST_ENTRIES) return false;
  const paths = new Set<string>();
  for (const raw of candidate.files) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const file = raw as Record<string, unknown>;
    if (!isSafeBundlePath(file.path) || paths.has(file.path)) return false;
    if (file.kind !== "database" && file.kind !== "audio" && file.kind !== "video") return false;
    if (typeof file.size !== "number" || !Number.isSafeInteger(file.size) || file.size < 0) return false;
    if (typeof file.sha256 !== "string" || !SHA256_RE.test(file.sha256)) return false;
    if (typeof file.required !== "boolean") return false;
    paths.add(file.path);
  }
  const databaseEntries = candidate.files.filter((file) => {
    const entry = file as Record<string, unknown>;
    return entry.kind === "database";
  }) as Array<Record<string, unknown>>;
  return databaseEntries.length === 1 && databaseEntries[0].path === "database/deeplistener.db";
}

/** Validate every manifest entry, checksum, containment boundary, and SQLite DB. */
export async function validateBackup(backupPath: string): Promise<BackupValidation> {
  if (!isAbsolute(backupPath)) return { ok: false, reason: "destination-invalid" };
  let manifest: unknown;
  try {
    const rootInfo = await lstat(backupPath);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) return { ok: false, reason: "manifest-invalid" };
    manifest = JSON.parse(await readFile(path.join(backupPath, BACKUP_MANIFEST_NAME), "utf8"));
  } catch {
    return { ok: false, reason: "manifest-invalid" };
  }
  if (!validateManifestShape(manifest)) return { ok: false, reason: "manifest-invalid" };
  const typedManifest = manifest;
  for (const entry of typedManifest.files) {
    const absolute = containedPath(backupPath, entry.path);
    if (!absolute) return { ok: false, reason: "manifest-invalid" };
    let info;
    try {
      info = await lstat(absolute);
      if (!info.isFile() || info.isSymbolicLink() || info.size !== entry.size) {
        return { ok: false, reason: "integrity-failed" };
      }
      const digest = await hashFile(absolute);
      if (digest.sha256 !== entry.sha256) return { ok: false, reason: "integrity-failed" };
    } catch {
      return { ok: false, reason: entry.required ? "source-not-readable" : "integrity-failed" };
    }
  }
  const databasePath = containedPath(backupPath, "database/deeplistener.db");
  if (!databasePath || !(await sqliteIntegrityOk(databasePath))) {
    return { ok: false, reason: "sqlite-check-failed" };
  }
  return { ok: true, manifest: typedManifest };
}

/** Create a complete portable backup bundle using only disposable/explicit roots. */
export async function createBackup(input: CreateBackupInput): Promise<BackupResult> {
  if (!isAbsolute(input.destination)) return { ok: false, reason: "destination-invalid" };
  const destination = path.resolve(input.destination);
  if (await exists(destination)) return { ok: false, reason: "destination-exists" };

  const sourceDb = databaseFile(input.source.root, input.source.mode);
  if (!(await exists(sourceDb))) return { ok: false, reason: "source-database-missing" };
  const parent = path.dirname(destination);
  const staging = `${destination}.staging-${randomUUID()}`;
  try {
    await mkdir(parent, { recursive: true });
    await mkdir(staging, { recursive: true });

    const sourceEntries: Array<{ sourcePath: string; bundlePath: string; kind: BackupEntryKind }> = [
      { sourcePath: sourceDb, bundlePath: "database/deeplistener.db", kind: "database" },
    ];
    // SQLite may have sidecars while the server is open. Preserve them as
    // optional portable entries; the main DB remains the integrity anchor.
    for (const suffix of ["-wal", "-shm"]) {
      const sidecar = `${sourceDb}${suffix}`;
      if (await exists(sidecar)) {
        sourceEntries.push({ sourcePath: sidecar, bundlePath: `database/deeplistener.db${suffix}`, kind: "database" });
      }
    }
    sourceEntries.push(
      ...(await collectFiles(mediaDirectoryFor("audio", input.source.root, input.source.mode), "audio", "media/audio")),
      ...(await collectFiles(mediaDirectoryFor("video", input.source.root, input.source.mode), "video", "media/video")),
    );

    const files: BackupFileEntry[] = [];
    for (const sourceEntry of sourceEntries) {
      files.push(await copyEntry(sourceEntry.sourcePath, staging, {
        path: sourceEntry.bundlePath,
        kind: sourceEntry.kind,
        required: sourceEntry.kind !== "database" || sourceEntry.bundlePath === "database/deeplistener.db",
      }));
    }
    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      ...(input.appVersion ? { appVersion: input.appVersion } : {}),
      sourceMode: input.source.mode,
      files,
    };
    if (!validateManifestShape(manifest)) throw new Error("manifest-shape");
    await writeFile(
      path.join(staging, BACKUP_MANIFEST_NAME),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    const validation = await validateBackup(staging);
    if (!validation.ok) throw new Error(validation.reason === "sqlite-check-failed" ? "sqlite-check" : validation.reason);
    await rename(staging, destination);
    return { ok: true, backupPath: destination, manifest: validation.manifest };
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    return { ok: false, reason: safeReason(error) };
  }
}

async function findConflicts(targetRoot: string): Promise<string[]> {
  if (!(await exists(targetRoot))) return [];
  const conflicts: string[] = [];
  for (const relative of ["database/deeplistener.db", "media/audio", "media/video"]) {
    if (await exists(path.join(targetRoot, ...relative.split("/")))) conflicts.push(relative);
  }
  return conflicts;
}

/** Stage a validated restore without touching the target root. */
export async function stageRestore(input: StageRestoreInput): Promise<StageRestoreResult> {
  if (!isAbsolute(input.backupPath) || !isAbsolute(input.targetRoot)) {
    return { ok: false, reason: "target-invalid" };
  }
  const targetRoot = path.resolve(input.targetRoot);
  const backupPath = path.resolve(input.backupPath);
  if (targetRoot === backupPath || path.dirname(targetRoot) === backupPath) {
    return { ok: false, reason: "target-invalid" };
  }
  const validation = await validateBackup(backupPath);
  if (!validation.ok) return validation;
  try {
    if (await exists(targetRoot)) {
      const info = await lstat(targetRoot);
      if (info.isSymbolicLink() || !info.isDirectory()) return { ok: false, reason: "target-invalid" };
    }
    const parent = path.dirname(targetRoot);
    await mkdir(parent, { recursive: true });
    const stagingPath = path.join(parent, `.deeplistener-restore-${randomUUID()}`);
    await mkdir(stagingPath, { recursive: true });
    try {
      for (const entry of validation.manifest.files) {
        const from = containedPath(backupPath, entry.path);
        const to = containedPath(stagingPath, entry.path);
        if (!from || !to) throw new Error("bundle-path-invalid");
        await mkdir(path.dirname(to), { recursive: true });
        await copyFile(from, to);
      }
      await writeFile(
        path.join(stagingPath, BACKUP_MANIFEST_NAME),
        `${JSON.stringify(validation.manifest, null, 2)}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      const stagedValidation = await validateBackup(stagingPath);
      if (!stagedValidation.ok) throw new Error(stagedValidation.reason);
      const conflicts = await findConflicts(targetRoot);
      return {
        ok: true,
        status: conflicts.length > 0 ? "conflict" : "staged",
        stage: { stagingPath, targetRoot, manifest: stagedValidation.manifest, conflicts },
      };
    } catch (error) {
      await rm(stagingPath, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    }
  } catch {
    return { ok: false, reason: "stage-failed" };
  }
}

/** Re-open a staged restore after a user confirmation round-trip. */
export async function inspectRestoreStage(input: {
  stagingPath: string;
  targetRoot: string;
}): Promise<RestoreStage | null> {
  if (!isAbsolute(input.stagingPath) || !isAbsolute(input.targetRoot)) return null;
  const stagingPath = path.resolve(input.stagingPath);
  const targetRoot = path.resolve(input.targetRoot);
  if (!path.basename(stagingPath).startsWith(".deeplistener-restore-") || path.dirname(stagingPath) !== path.dirname(targetRoot)) return null;
  const validation = await validateBackup(stagingPath);
  if (!validation.ok) return null;
  return {
    stagingPath,
    targetRoot,
    manifest: validation.manifest,
    conflicts: await findConflicts(targetRoot),
  };
}

/**
 * Atomically activate a staged restore. Existing data is renamed to a sibling
 * rollback directory before the staged root is promoted. No existing root is
 * deleted by this function; callers can keep or explicitly remove the sibling
 * after a later retention policy decision.
 */
export async function activateRestore(input: {
  stage: RestoreStage;
  confirmReplace: boolean;
}): Promise<ActivateRestoreResult> {
  const { stage } = input;
  if (!isAbsolute(stage.stagingPath) || !isAbsolute(stage.targetRoot)) {
    return { ok: false, reason: "target-invalid" };
  }
  const stagingPath = path.resolve(stage.stagingPath);
  const targetRoot = path.resolve(stage.targetRoot);
  if (!path.basename(stagingPath).startsWith(".deeplistener-restore-") || path.dirname(stagingPath) !== path.dirname(targetRoot)) {
    return { ok: false, reason: "stage-invalid" };
  }
  const validation = await validateBackup(stagingPath);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const conflicts = await findConflicts(targetRoot);
  if (conflicts.length > 0 && !input.confirmReplace) {
    return { ok: false, reason: "confirmation-required", stagingPath, conflicts };
  }

  const previousRoot = `${targetRoot}.pre-restore-${randomUUID()}`;
  let movedPrevious = false;
  try {
    await mkdir(path.dirname(targetRoot), { recursive: true });
    if (await exists(targetRoot)) {
      const info = await lstat(targetRoot);
      if (info.isSymbolicLink() || !info.isDirectory()) return { ok: false, reason: "target-invalid" };
      await rename(targetRoot, previousRoot);
      movedPrevious = true;
    }
    await rename(stagingPath, targetRoot);
    return { ok: true, targetRoot, previousRoot: movedPrevious ? previousRoot : undefined, manifest: validation.manifest };
  } catch {
    // Roll back the directory swap if promotion failed. If rollback itself
    // fails, the previous root is still present as a recoverable sibling.
    if (movedPrevious && !(await exists(targetRoot))) {
      await rename(previousRoot, targetRoot).catch(() => undefined);
    }
    return { ok: false, reason: "activation-failed", stagingPath };
  }
}

/** Abort a staged restore; it only removes the operation-owned staging root. */
export async function discardRestoreStage(stagingPath: string): Promise<boolean> {
  if (!isAbsolute(stagingPath) || !path.basename(stagingPath).startsWith(".deeplistener-restore-")) return false;
  await rm(stagingPath, { recursive: true, force: true });
  return true;
}
