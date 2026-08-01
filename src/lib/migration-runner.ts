/**
 * Offline migration runner (W2-D T140 + T142).
 *
 * Initializes a disposable / desktop SQLite database offline by replaying the
 * frozen migration SQL files (under prisma/migrations) directly
 * against the target file, without invoking `prisma migrate dev` / `db push`
 * and without spawning
 * the Prisma CLI. This satisfies DLR-001 (first-run init), DLR-003 (idempotent
 * versioned migration), and DLR-004 (recoverable migration failure).
 *
 * Driver decision (see `docs/desktop-w0/migration-runner.md`, T013): T013's
 * primary selection was bundled `prisma migrate deploy`. For a packaged
 * app, shelling out to the Prisma CLI is not reliably portable and would
 * require bundling the schema-engine binary. The cleanest no-new-dependency,
 * fully-offline path is Node's built-in `node:sqlite` (`DatabaseSync`),
 * available on Node 22+ and verified on the project's Node 24 runtime. This
 * is the T013 "Option B recovery fallback" promoted to the implementation
 * path: it needs ZERO new deps, ZERO shell-out, runs deterministically, and
 * applies all 15 frozen migrations cleanly. If `node:sqlite` is ever
 * unavailable in some runtime, callers should fall back to the bundled
 * `prisma migrate deploy` packaging (T180).
 *
 * Tracking table: we use our own `_deeplistener_migrations` (not Prisma's
 * `_prisma_migrations`) so this runner stays decoupled from Prisma's
 * internals. Each migration is applied inside a single transaction; a
 * PRIMARY KEY on the migration name makes re-runs a no-op.
 *
 * Safety: the runner only ever touches the path passed to it. It NEVER
 * references `prisma/dev.db`, `DATABASE_URL`, or any active database. All
 * callers in tests route it at mktemp dirs.
 */
import { constants } from "node:fs";
import { access, copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Result of a migration run. `ok: true` always carries the full applied /
 * already-applied breakdown; `ok: false` carries the failure detail.
 */
export type MigrationResult =
  | { ok: true; applied: string[]; alreadyApplied: string[] }
  | { ok: false; error: string; failedMigration?: string };

/** Result of the pre-migration backup gate (T142 / DLR-002). */
export type BackupResult =
  | { ok: true; skipped: boolean; backupPath?: string }
  | { ok: false; reason: string };

/** The runner's own tracking table (deliberately distinct from `_prisma_migrations`). */
const TRACKING_TABLE = "_deeplistener_migrations";

/**
 * A minimal, synchronous SQLite interface used by this module. Modeled on the
 * subset of `node:sqlite`'s `DatabaseSync` we actually use so the runner can
 * be unit-tested with a stub.
 */
export interface SqliteConnection {
  exec(sql: string): void;
  prepare(sql: string): { get(...params: unknown[]): unknown; all(...params: unknown[]): unknown[]; run(...params: unknown[]): unknown };
  close(): void;
}

/**
 * Opener used to obtain a `DatabaseSync`-shaped connection. Indirection lets
 * tests inject a custom opener and lets the module lazy-import `node:sqlite`
 * (an experimental, opt-in module) without breaking environments where it is
 * absent.
 */
export type SqliteOpener = (dbFilePath: string) => Promise<SqliteConnection>;

/** Default opener backed by Node's built-in `node:sqlite` (Node 22+). */
const defaultOpener: SqliteOpener = async (dbFilePath: string) => {
  // Dynamic import: `node:sqlite` is experimental and absent on older runtimes.
  // Keeping this dynamic lets the module load even when the binding is missing,
  // so the failure is surfaced at call time with a clear message instead of at
  // import time.
  const mod = (await import("node:sqlite")) as {
    DatabaseSync: new (location: string) => SqliteConnection;
  };
  return new mod.DatabaseSync(dbFilePath);
};

/** Resolve the bundled migrations directory (frozen; this module only reads it). */
function bundledMigrationsDir(): string {
  // The frozen inputs live at <repo>/prisma/migrations. From this module
  // (src/lib/) that resolves to ../../prisma/migrations.
  return path.resolve(import.meta.dirname ?? ".", "..", "..", "prisma", "migrations");
}

/**
 * A single pending migration: directory name (timestamped, sortable) and the
 * absolute path to its `migration.sql`. Only directories with a readable
 * `migration.sql` are considered.
 */
export interface PendingMigration {
  name: string;
  sqlPath: string;
}

/**
 * Discover bundled migrations, sorted in apply order. Migration directory
 * names are timestamp-prefixed (e.g. `20260124102615_init`), so lexical sort
 * is the correct dependency order.
 */
export async function discoverMigrations(
  migrationsDir: string = bundledMigrationsDir(),
): Promise<PendingMigration[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const result: PendingMigration[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sqlPath = path.join(migrationsDir, entry.name, "migration.sql");
    try {
      // Confirm the file exists and is readable before including it.
      await stat(sqlPath);
    } catch {
      // A migration dir without migration.sql is not a migration we can apply.
      continue;
    }
    result.push({ name: entry.name, sqlPath });
  }
  // Lexical sort preserves the timestamp ordering Prisma relies on.
  result.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return result;
}

/**
 * Ensure the tracking table exists. Safe to call repeatedly; uses
 * `CREATE TABLE IF NOT EXISTS`.
 */
function ensureTrackingTable(db: SqliteConnection): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      name TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL
    );`,
  );
}

/** Read the set of already-applied migration names from the tracking table. */
function appliedMigrationNames(db: SqliteConnection): Set<string> {
  const rows = db
    .prepare(`SELECT name FROM ${TRACKING_TABLE} ORDER BY name ASC`)
    .all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

/**
 * Apply migrations to the given DB file offline.
 *
 * - Ensures the tracking table exists.
 * - Reads the bundled migration dirs in order.
 * - For each migration not already recorded, applies its SQL inside a single
 *   transaction and records completion. A PRIMARY KEY on the migration name
 *   makes a re-run of an applied migration a no-op.
 * - Fully idempotent: re-running is a no-op that returns `alreadyApplied`
 *   populated and `applied: []`.
 * - On failure, the failing migration's transaction is rolled back, so the DB
 *   is left in its pre-failure state and `ok:false` is returned with the
 *   `failedMigration` name (DLR-004).
 *
 * @param dbFilePath Absolute path to the target SQLite file.
 * @param opener Optional custom SQLite opener (for tests).
 * @param migrationsDir Optional override of the migrations source dir.
 */
export async function migrateDatabase(
  dbFilePath: string,
  opener: SqliteOpener = defaultOpener,
  migrationsDir: string = bundledMigrationsDir(),
): Promise<MigrationResult> {
  const migrations = await discoverMigrations(migrationsDir);
  // Ensure the DB file's parent directory exists before opening — the fresh
  // profile case (DLR-001) hands us a path whose directory may not yet exist,
  // and `node:sqlite` cannot create a file under a missing directory.
  await mkdir(path.dirname(dbFilePath), { recursive: true });
  const db = await opener(dbFilePath);
  try {
    ensureTrackingTable(db);
    const already = appliedMigrationNames(db);

    // Drift detection: if a migration that was previously recorded as applied
    // is no longer present in the bundled set, the bundle and the live DB have
    // diverged. Applying the remaining migrations silently would mask this, so
    // surface it as a hard failure with the missing names.
    const bundledNames = new Set(migrations.map((m) => m.name));
    const drifted = [...already].filter((name) => !bundledNames.has(name));
    if (drifted.length > 0) {
      return {
        ok: false,
        error: `Migration drift detected: ${drifted.length} previously-applied migration(s) are missing from the bundled set: ${drifted.join(", ")}. Restore the migration files or repair the tracking table before continuing.`,
        failedMigration: drifted[0],
      };
    }
    const insertCompletion = db.prepare(
      `INSERT INTO ${TRACKING_TABLE} (name, applied_at) VALUES (?, ?)`,
    );
    const applied: string[] = [];
    const alreadyApplied: string[] = [];
    for (const migration of migrations) {
      if (already.has(migration.name)) {
        alreadyApplied.push(migration.name);
        continue;
      }
      const sql = await readFile(migration.sqlPath, "utf8");
      try {
        db.exec("BEGIN");
        try {
          db.exec(sql);
          insertCompletion.run(migration.name, new Date().toISOString());
          db.exec("COMMIT");
        } catch (inner) {
          // Roll back the failing migration transaction; the DB is back to its
          // pre-failure state. Any prior, committed migrations remain intact.
          try {
            db.exec("ROLLBACK");
          } catch {
            // Ignore a rollback failure; the original error is the real signal.
          }
          throw inner;
        }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          failedMigration: migration.name,
        };
      }
      applied.push(migration.name);
    }
    return { ok: true, applied, alreadyApplied };
  } finally {
    db.close();
  }
}

/**
 * Pre-migration backup gate (T142 / DLR-002).
 *
 * - If the DB file does NOT exist (fresh profile), there is nothing to
 *   protect: returns `{ok:true, skipped:true}`. Migration proceeds.
 * - If the DB file exists, copies it into `backupDir` under a timestamped
 *   name and verifies the copy by size match. Returns the backup path on
 *   success.
 * - On any failure (copy error, size mismatch, unwritable backup dir), returns
 *   `{ok:false}` so the caller blocks the migration (DLR-002: failure to
 *   create/validate the backup SHALL block the write).
 *
 * @param dbFilePath Absolute path to the SQLite file to protect.
 * @param backupDir Absolute directory to place the backup in (created if needed).
 */
export async function preflightBackup(
  dbFilePath: string,
  backupDir: string,
): Promise<BackupResult> {
  let srcSize: number;
  try {
    const s = await stat(dbFilePath);
    srcSize = s.size;
  } catch {
    // Source DB does not exist (fresh profile): nothing to back up.
    return { ok: true, skipped: true };
  }

  try {
    await mkdir(backupDir, { recursive: true });
    // Confirm the backup dir is writable before copying.
    await accessWritable(backupDir);
  } catch (err) {
    return {
      ok: false,
      reason: `Backup directory not writable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.basename(dbFilePath);
  const backupPath = path.join(backupDir, `${base}.pre-migration.${stamp}`);
  try {
    await copyFile(dbFilePath, backupPath);
  } catch (err) {
    return {
      ok: false,
      reason: `Backup copy failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Verify the backup by size match (cheap, deterministic integrity signal).
  let dstSize: number;
  try {
    dstSize = (await stat(backupPath)).size;
  } catch (err) {
    return {
      ok: false,
      reason: `Backup verification (stat) failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (dstSize !== srcSize) {
    return {
      ok: false,
      reason: `Backup size mismatch (src=${srcSize}, dst=${dstSize})`,
    };
  }
  return { ok: true, skipped: false, backupPath };
}

/** Reject if the given path is not a writable directory. */
async function accessWritable(dir: string): Promise<void> {
  await access(dir, constants.W_OK);
}

/**
 * Orchestrate the full initialization sequence for a target DB:
 *   1. preflight backup (T142) — skipped on fresh profile
 *   2. migrate (T140)
 *   3. return the combined result
 *
 * If the backup gate fails, migration is NOT attempted and the failure is
 * returned as `ok:false`. This is the single entry point Desktop first-run
 * should call against a disposable / staged DB path.
 */
export async function ensureDatabaseReady(
  dbFilePath: string,
  backupDir: string,
  opener: SqliteOpener = defaultOpener,
  migrationsDir: string = bundledMigrationsDir(),
): Promise<
  | { ok: true; migration: MigrationResult; backup: BackupResult }
  | { ok: false; stage: "backup" | "migrate"; backup?: BackupResult; migration?: MigrationResult }
> {
  const backup = await preflightBackup(dbFilePath, backupDir);
  if (!backup.ok) {
    return { ok: false, stage: "backup", backup };
  }
  const migration = await migrateDatabase(dbFilePath, opener, migrationsDir);
  if (!migration.ok) {
    return { ok: false, stage: "migrate", backup, migration };
  }
  return { ok: true, migration, backup };
}

/**
 * Probe whether the `node:sqlite` driver is usable in the current runtime.
 * Exported for callers (and tests) that want to decide whether to fall back to
 * the bundled `prisma migrate deploy` packaging path.
 */
export async function isNodeSqliteAvailable(): Promise<boolean> {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}
