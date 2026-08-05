/**
 * Copy-first import of the legacy Server layout into a Desktop data root.
 *
 * The source is read through the existing manifest-backed backup service. The
 * only mutable path before activation is an operation-owned staging root. The
 * staged database is migrated in place, its manifest checksum is refreshed,
 * and callers must make a separate explicit activation call.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  activateRestore,
  createBackup,
  discardRestoreStage,
  inspectRestoreStage,
  stageRestore,
  validateBackup,
  type ActivateRestoreResult,
  type BackupManifest,
  type RestoreStage,
} from "./backup-service";
import { migrateDatabase, type MigrationResult, type SqliteConnection, type SqliteOpener } from "./migration-runner";

export interface LegacyImportInput {
  /** Absolute root containing the legacy `prisma/` and `public/` folders. */
  sourceRoot: string;
  /** Absolute Desktop data root that will receive the imported copy. */
  targetRoot: string;
  /** Override only in tests or a packaged runtime. */
  migrationsDir?: string;
}

export interface LegacyImportStage {
  stagingPath: string;
  targetRoot: string;
  sourceRoot: string;
  manifest: BackupManifest;
  migration: Extract<MigrationResult, { ok: true }>;
}

export type LegacyImportFailureReason =
  | "source-invalid"
  | "source-copy-failed"
  | "stage-failed"
  | "migration-failed"
  | "manifest-refresh-failed"
  | "stage-missing";

export type LegacyImportStageResult =
  | { ok: true; stage: LegacyImportStage }
  | { ok: false; reason: LegacyImportFailureReason; detail?: string };

function absoluteDistinctRoots(sourceRoot: string, targetRoot: string): boolean {
  if (!path.isAbsolute(sourceRoot) || !path.isAbsolute(targetRoot)) return false;
  return path.resolve(sourceRoot) !== path.resolve(targetRoot);
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
    stream.on("end", resolve);
  });
  return { size, sha256: digest.digest("hex") };
}

/**
 * A legacy Prisma database already has `_prisma_migrations`. Seed the
 * portable runner's tracking table from completed bundled migrations so the
 * runner does not try to replay `CREATE TABLE` against an existing schema.
 * This touches only the staged copy.
 */
async function seedLegacyMigrationTracking(
  dbFilePath: string,
  migrationsDir: string | undefined,
  opener: SqliteOpener,
): Promise<SqliteConnection> {
  const db = await opener(dbFilePath);
  try {
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'")
      .get();
    if (!table) return db;

    const bundled = await import("./migration-runner").then(({ discoverMigrations }) => discoverMigrations(migrationsDir));
    const bundledNames = new Set(bundled.map((migration) => migration.name));
    const rows = db
      .prepare("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY started_at ASC")
      .all() as Array<{ migration_name?: unknown }>;
    db.exec(
      "CREATE TABLE IF NOT EXISTS _deeplistener_migrations (name TEXT NOT NULL PRIMARY KEY, applied_at TEXT NOT NULL);",
    );
    const insert = db.prepare(
      "INSERT OR IGNORE INTO _deeplistener_migrations (name, applied_at) VALUES (?, ?)",
    );
    const now = new Date().toISOString();
    for (const row of rows) {
      if (typeof row.migration_name === "string" && bundledNames.has(row.migration_name)) {
        insert.run(row.migration_name, now);
      }
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

async function defaultSqliteOpener(dbFilePath: string): Promise<SqliteConnection> {
  const mod = (await import("node:sqlite")) as {
    DatabaseSync: new (location: string) => SqliteConnection;
  };
  return new mod.DatabaseSync(dbFilePath);
}

async function refreshStagedDatabaseEntry(
  stagingPath: string,
  manifest: BackupManifest,
): Promise<BackupManifest> {
  const database = manifest.files.find((entry) => entry.kind === "database" && entry.path === "database/deeplistener.db");
  if (!database) throw new Error("database-entry-missing");
  const databasePath = path.join(stagingPath, "database", "deeplistener.db");
  const digest = await hashFile(databasePath);
  const refreshed: BackupManifest = {
    ...manifest,
    files: manifest.files.map((entry) => (entry === database ? { ...entry, ...digest } : entry)),
  };
  const manifestPath = path.join(stagingPath, "manifest.json");
  const temporary = `${manifestPath}.tmp-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(refreshed, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, manifestPath);
  const validation = await validateBackup(stagingPath);
  if (!validation.ok) throw new Error(validation.reason);
  return validation.manifest;
}

/** Copy and migrate a legacy source without replacing the target root. */
export async function stageLegacyImport(input: LegacyImportInput): Promise<LegacyImportStageResult> {
  if (!absoluteDistinctRoots(input.sourceRoot, input.targetRoot)) return { ok: false, reason: "source-invalid" };
  const sourceRoot = path.resolve(input.sourceRoot);
  const targetRoot = path.resolve(input.targetRoot);
  const operationRoot = path.dirname(targetRoot);
  const backupPath = path.join(operationRoot, `.deeplistener-legacy-import-${Date.now()}.backup`);
  let stagedPath: string | undefined;
  try {
    const backup = await createBackup({
      source: { root: sourceRoot, mode: "legacy" },
      destination: backupPath,
    });
    if (!backup.ok) return { ok: false, reason: "source-copy-failed", detail: backup.reason };

    const staged = await stageRestore({ backupPath, targetRoot });
    if (!staged.ok) return { ok: false, reason: "stage-failed", detail: staged.reason };
    stagedPath = staged.stage.stagingPath;

    const databasePath = path.join(stagedPath, "database", "deeplistener.db");
    const migration = await migrateDatabase(
      databasePath,
      (dbPath) => seedLegacyMigrationTracking(dbPath, input.migrationsDir, defaultSqliteOpener),
      input.migrationsDir,
    );
    if (!migration.ok) {
      await discardRestoreStage(stagedPath);
      return { ok: false, reason: "migration-failed", detail: migration.error };
    }

    const manifest = await refreshStagedDatabaseEntry(stagedPath, staged.stage.manifest);
    const inspected = await inspectRestoreStage({ stagingPath: stagedPath, targetRoot });
    if (!inspected) throw new Error("stage-missing");
    return {
      ok: true,
      stage: {
        stagingPath: stagedPath,
        targetRoot,
        sourceRoot,
        manifest,
        migration,
      },
    };
  } catch (error) {
    if (stagedPath) await discardRestoreStage(stagedPath).catch(() => undefined);
    return {
      ok: false,
      reason: stagedPath ? "manifest-refresh-failed" : "stage-failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await rm(backupPath, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Activate a previously staged import; conflicts require explicit confirmation. */
export async function activateLegacyImport(input: {
  stage: LegacyImportStage;
  confirmReplace: boolean;
}): Promise<ActivateRestoreResult> {
  const inspected = await inspectRestoreStage({
    stagingPath: input.stage.stagingPath,
    targetRoot: input.stage.targetRoot,
  });
  if (!inspected) return { ok: false, reason: "stage-invalid" };
  return activateRestore({ stage: inspected as RestoreStage, confirmReplace: input.confirmReplace });
}
