/**
 * Tests for the offline migration runner (W2-D T140 / T142).
 *
 * All database I/O targets disposable mktemp directories. The repo's
 * `prisma/dev.db` and `DATABASE_URL` are NEVER referenced: this suite asserts
 * that explicitly. The real bundled `prisma/migrations/**` inputs are used for
 * the apply / idempotency / pending cases (read-only), and a small fake
 * migrations tree is constructed for the controlled failure case so the frozen
 * inputs are never mutated.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  migrateDatabase,
  preflightBackup,
  ensureDatabaseReady,
  isNodeSqliteAvailable,
  type SqliteConnection,
  type SqliteOpener,
} from "./migration-runner";

/** Real bundled migrations dir (frozen inputs — read-only here). */
const REAL_MIGRATIONS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "prisma",
  "migrations",
);

/** Active DB paths that MUST NEVER be touched by these tests. */
const PROTECTED_DB_PATHS = [
  path.resolve(__dirname, "..", "..", "prisma", "dev.db"),
];

/** Create a fresh temp dir + db path. Returns {root, dbPath, dispose}. */
function freshTempDb(prefix = "deeplistener-mr-test-") {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  const dbPath = path.join(root, "test.db");
  return {
    root,
    dbPath,
    dispose: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    },
  };
}

/** Default opener backed by the real `node:sqlite` driver. */
const realOpener: SqliteOpener = async (dbFilePath) =>
  new DatabaseSync(dbFilePath) as unknown as SqliteConnection;

/** Build a tiny fake migrations tree (for the controlled failure case). */
function fakeMigrationsTree(
  entries: Array<{ name: string; sql: string }>,
): { dir: string; dispose: () => void } {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-fakemig-"));
  for (const entry of entries) {
    const sub = path.join(root, entry.name);
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(sub, "migration.sql"), entry.sql, "utf8");
  }
  return {
    dir: root,
    dispose: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    },
  };
}

/** Count tracked migrations in a DB file via a fresh connection. */
function trackedNames(dbPath: string): string[] {
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(
      "CREATE TABLE IF NOT EXISTS _deeplistener_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
    );
    const rows = db
      .prepare("SELECT name FROM _deeplistener_migrations ORDER BY name ASC")
      .all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
  } finally {
    db.close();
  }
}

/** Names of all tables excluding only the runner's tracking table and sqlite internals. */
function userTables(dbPath: string): string[] {
  const db = new DatabaseSync(dbPath);
  try {
    const rows = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_deeplistener_migrations' ORDER BY name ASC",
      )
      .all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
  } finally {
    db.close();
  }
}

/** Column names for a migrated table, used to catch schema/migration drift. */
function tableColumns(dbPath: string, tableName: string): string[] {
  const db = new DatabaseSync(dbPath);
  try {
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  } finally {
    db.close();
  }
}

test("node:sqlite driver is available in this runtime", async () => {
  assert.equal(await isNodeSqliteAvailable(), true);
});

test("fresh DB: migrate creates all business tables and records every migration", async () => {
  const env = freshTempDb();
  try {
    const result = await migrateDatabase(env.dbPath, realOpener, REAL_MIGRATIONS_DIR);
    assert.equal(result.ok, true, `expected ok, got ${JSON.stringify(result)}`);
    if (!result.ok) return; // narrow
    assert.equal(result.alreadyApplied.length, 0, "nothing should be pre-applied on a fresh DB");
    // Every frozen migration directory should be reflected.
    assert.ok(result.applied.length >= 15, `expected >=15 applied, got ${result.applied.length}`);

    // All 9 business tables exist (per T013 evidence).
    const tables = userTables(env.dbPath);
    for (const expected of [
      "Track",
      "Sentence",
      "ReviewItem",
      "ErrorTag",
      "ReviewLog",
      "Category",
      "TrackCategory",
      "StudySession",
      "_ErrorTagToReviewItem",
    ]) {
      assert.ok(tables.includes(expected), `missing table ${expected}; have ${tables.join(",")}`);
    }

    const reviewItemColumns = tableColumns(env.dbPath, "ReviewItem");
    for (const expected of ["state", "reps", "lapses", "lastReview"]) {
      assert.ok(
        reviewItemColumns.includes(expected),
        `migration history is missing ReviewItem.${expected}; have ${reviewItemColumns.join(",")}`,
      );
    }

    // Tracking table records the same set.
    const tracked = trackedNames(env.dbPath);
    assert.equal(tracked.length, result.applied.length);
    for (const name of result.applied) {
      assert.ok(tracked.includes(name), `tracking missing ${name}`);
    }
  } finally {
    env.dispose();
  }
});

test("fresh DB: migrate is idempotent (re-run applies nothing)", async () => {
  const env = freshTempDb();
  try {
    const first = await migrateDatabase(env.dbPath, realOpener, REAL_MIGRATIONS_DIR);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const firstApplied = first.applied.length;

    const second = await migrateDatabase(env.dbPath, realOpener, REAL_MIGRATIONS_DIR);
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.applied.length, 0, "re-run must apply nothing");
    assert.equal(
      second.alreadyApplied.length,
      firstApplied,
      "all prior migrations should be already-applied",
    );

    // The DB file should not change between idempotent runs beyond mtime; table
    // count stays stable.
    const tables = userTables(env.dbPath);
    assert.ok(tables.includes("Track"));
  } finally {
    env.dispose();
  }
});

test("existing DB with some migrations applied: applies only pending", async () => {
  const env = freshTempDb();
  try {
    // First run: apply everything.
    const first = await migrateDatabase(env.dbPath, realOpener, REAL_MIGRATIONS_DIR);
    assert.equal(first.ok, true);
    if (!first.ok) return;

    // Simulate an upgrade: roll the tracking table back to the first N
    // migrations, leaving the schema in place but the tracker "behind".
    const db = new DatabaseSync(env.dbPath);
    try {
      const all = first.applied;
      const keep = all.slice(0, 3); // pretend only first 3 are recorded
      db.exec("DELETE FROM _deeplistener_migrations");
      const ins = db.prepare(
        "INSERT INTO _deeplistener_migrations (name, applied_at) VALUES (?, ?)",
      );
      for (const name of keep) ins.run(name, new Date().toISOString());
    } finally {
      db.close();
    }

    // Second run should re-apply the remaining migrations. Note: because the
    // later migrations are destructive re-creates (DROP TABLE / RENAME), and
    // the schema already exists, the idempotent guard on the tracker is the
    // load-bearing signal here. We assert that only pending names are reported
    // as applied and that none of the already-recorded ones are reapplied.
    const second = await migrateDatabase(env.dbPath, realOpener, REAL_MIGRATIONS_DIR);
    // The destructive migrations may legitimately fail when re-run against an
    // already-migrated schema (e.g. ADD COLUMN on an existing column). Either
    // outcome is acceptable for THIS test's intent (pending detection). We
    // assert the structural property: no already-recorded migration is
    // re-applied.
    if (second.ok) {
      for (const name of second.applied) {
        assert.ok(
          !["20260124102615_init", "20260125014852_add_is_archived", "20260125103353_add_difficulty"].includes(name),
          `already-recorded migration ${name} must not be re-applied`,
        );
      }
    } else {
      // If it failed, the failure must name a PENDING migration, not one of the
      // three we recorded as already-applied.
      assert.ok(second.failedMigration);
      assert.ok(
        !["20260124102615_init", "20260125014852_add_is_archived", "20260125103353_add_difficulty"].includes(second.failedMigration!),
        `failure must be on a pending migration, not ${second.failedMigration}`,
      );
    }
  } finally {
    env.dispose();
  }
});

test("corrupt/failing SQL: returns ok:false with failedMigration and leaves DB in pre-failure state", async () => {
  const fake = fakeMigrationsTree([
    {
      name: "20260101000000_good",
      sql: "CREATE TABLE good_marker (x INTEGER); INSERT INTO good_marker VALUES (1);",
    },
    {
      name: "20260102000000_bad",
      sql: "CREATE TABLE will_succeed (x INTEGER); INSERT INTO nonexistent_table VALUES (1);",
    },
  ]);
  const env = freshTempDb();
  try {
    const result = await migrateDatabase(env.dbPath, realOpener, fake.dir);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.failedMigration, "20260102000000_bad");
    assert.match(result.error, /no such table/i);

    // The good migration (committed before the failure) must persist...
    const db = new DatabaseSync(env.dbPath);
    try {
      assert.ok(
        db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='good_marker'").get(),
        "pre-failure migration must persist",
      );
      // ...and the partially-applied objects from the failed migration must be
      // absent (its transaction rolled back).
      assert.equal(
        db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='will_succeed'").get(),
        undefined,
        "failed migration's partial DDL must be rolled back",
      );
      const tracked = trackedNames(env.dbPath);
      assert.deepEqual(tracked, ["20260101000000_good"], "only the committed migration is tracked");
    } finally {
      db.close();
    }
  } finally {
    env.dispose();
    fake.dispose();
  }
});

test("preflightBackup: missing DB (fresh profile) is skipped with ok:true", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-bk-skip-"));
  try {
    const dbPath = path.join(root, "does-not-exist.db");
    const backupDir = path.join(root, "backups");
    const res = await preflightBackup(dbPath, backupDir);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.skipped, true);
    assert.equal(res.backupPath, undefined, "no backup file should be created for a missing DB");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("preflightBackup: existing DB is copied with a size match", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-bk-copy-"));
  try {
    // Create a real (small) DB with some content.
    const dbPath = path.join(root, "src.db");
    const db = new DatabaseSync(dbPath);
    db.exec("CREATE TABLE t(x TEXT); INSERT INTO t VALUES ('payload');");
    db.close();
    const srcSize = statSync(dbPath).size;
    assert.ok(srcSize > 0);

    const backupDir = path.join(root, "backups");
    const res = await preflightBackup(dbPath, backupDir);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.skipped, false);
    assert.ok(res.backupPath, "backup path should be returned");
    assert.equal(statSync(res.backupPath!).size, srcSize, "backup size must match source");

    // Backup name should be timestamped and carry the source basename.
    assert.match(path.basename(res.backupPath!), /^src\.db\.pre-migration\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("preflightBackup: unwritable backup dir returns ok:false (migration must be blocked)", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-bk-ro-"));
  try {
    const dbPath = path.join(root, "src.db");
    const db = new DatabaseSync(dbPath);
    db.exec("CREATE TABLE t(x INTEGER); INSERT INTO t VALUES (1);");
    db.close();

    // Point the backup dir at a path whose PARENT is a file → mkdir fails.
    const blocker = path.join(root, "blocker-file");
    writeFileSync(blocker, "x", "utf8");
    const backupDir = path.join(blocker, "nested"); // cannot create dir under a file
    const res = await preflightBackup(dbPath, backupDir);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.ok(res.reason.length > 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ensureDatabaseReady: fresh profile → backup skipped, migration applied", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-edr-fresh-"));
  try {
    const dbPath = path.join(root, "db", "deeplistener.db");
    const backupDir = path.join(root, "backups");
    const res = await ensureDatabaseReady(dbPath, backupDir, realOpener, REAL_MIGRATIONS_DIR);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.backup.ok, true);
    if (!res.backup.ok) return;
    assert.equal(res.backup.skipped, true);
    assert.equal(res.migration.ok, true);
    assert.ok(userTables(dbPath).includes("Track"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ensureDatabaseReady: existing DB → backup taken, then migration idempotent", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-edr-existing-"));
  try {
    const dbPath = path.join(root, "db", "deeplistener.db");
    mkdirSync(path.dirname(dbPath), { recursive: true });
    const backupDir = path.join(root, "backups");

    // Seed: create + fully migrate the DB first.
    const seed = await migrateDatabase(dbPath, realOpener, REAL_MIGRATIONS_DIR);
    assert.equal(seed.ok, true);
    const preSize = statSync(dbPath).size;

    // Now run the orchestrator against the already-migrated DB.
    const res = await ensureDatabaseReady(dbPath, backupDir, realOpener, REAL_MIGRATIONS_DIR);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.backup.ok, true);
    if (!res.backup.ok) return;
    assert.equal(res.backup.skipped, false, "existing DB must be backed up");
    assert.ok(res.backup.backupPath);
    assert.equal(statSync(res.backup.backupPath!).size, preSize, "backup must match pre-migration size");
    assert.equal(res.migration.ok, true);
    if (!res.migration.ok) return;
    assert.equal(res.migration.applied.length, 0, "idempotent re-run applies nothing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ensureDatabaseReady: failing migration is reported via stage:'migrate'", async () => {
  const fake = fakeMigrationsTree([
    { name: "20260101000000_ok", sql: "CREATE TABLE a(x INTEGER);" },
    { name: "20260102000000_bad", sql: "INSERT INTO missing VALUES (1);" },
  ]);
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-edr-fail-"));
  try {
    const dbPath = path.join(root, "db", "x.db");
    const backupDir = path.join(root, "backups");
    const res = await ensureDatabaseReady(dbPath, backupDir, realOpener, fake.dir);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.stage, "migrate");
  } finally {
    rmSync(root, { recursive: true, force: true });
    fake.dispose();
  }
});

test("SAFETY: no protected DB path is ever referenced or written by the runner", async () => {
  // Snapshot protected DB mtimes; run a full migrate cycle; assert unchanged.
  const before = new Map<string, { mtime: number; size: number; present: boolean }>();
  for (const p of PROTECTED_DB_PATHS) {
    try {
      const s = statSync(p);
      before.set(p, { mtime: s.mtimeMs, size: s.size, present: true });
    } catch {
      before.set(p, { mtime: 0, size: 0, present: false });
    }
  }

  const env = freshTempDb("deeplistener-mr-safety-");
  try {
    await migrateDatabase(env.dbPath, realOpener, REAL_MIGRATIONS_DIR);
  } finally {
    env.dispose();
  }

  for (const p of PROTECTED_DB_PATHS) {
    const prior = before.get(p)!;
    try {
      const s = statSync(p);
      assert.equal(
        s.mtimeMs,
        prior.mtime,
        `protected DB ${p} mtime must not change`,
      );
      assert.equal(s.size, prior.size, `protected DB ${p} size must not change`);
    } catch {
      assert.equal(prior.present, false, `protected DB ${p} must not be created`);
    }
  }
});
