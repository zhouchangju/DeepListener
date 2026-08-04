#!/usr/bin/env node
/**
 * Explicit repair tool for databases created before the Desktop migration
 * runner existed. It is intentionally dry-run by default and never chooses a
 * database path implicitly. Use --apply --yes only after reviewing the plan.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const valueFor = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const dbPath = valueFor("db");
const migrationsDir = path.resolve(valueFor("migrations-dir") || path.join(repo, "prisma", "migrations"));
const backupDir = path.resolve(valueFor("backup-dir") || path.join(repo, ".desktop-build", "db-repair-backups"));
const apply = args.includes("--apply");
const yes = args.includes("--yes");

if (!dbPath || !path.isAbsolute(dbPath)) {
  console.error("Usage: node scripts/repair-legacy-db.mjs --db /absolute/path/to.db [--apply --yes] [--backup-dir /absolute/dir]");
  process.exit(1);
}
if (!existsSync(dbPath)) {
  console.error(`[db-repair] database not found: ${dbPath}`);
  process.exit(1);
}
if (apply && !yes) {
  console.error("Refusing to write without both --apply and --yes. Review the dry-run plan first.");
  process.exit(1);
}

const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(migrationsDir, entry.name, "migration.sql")))
  .map((entry) => entry.name)
  .sort();
const db = new DatabaseSync(dbPath);
try {
  const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  if (!tableNames.includes("_prisma_migrations")) {
    throw new Error("_prisma_migrations is missing; this tool only repairs Prisma-created databases.");
  }
  const appliedByPrisma = new Set(
    db.prepare("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")
      .all()
      .map((row) => row.migration_name),
  );
  const reviewColumns = new Set(
    db.prepare("PRAGMA table_info(ReviewItem)").all().map((row) => row.name),
  );
  const finalMigration = migrationNames.at(-1);
  const finalMigrationReady = ["state", "reps", "lapses", "lastReview"].every((column) => reviewColumns.has(column));
  const missingHistorical = migrationNames.filter((name) => name !== finalMigration && !appliedByPrisma.has(name));
  if (missingHistorical.length) {
    throw new Error(`Cannot baseline safely: Prisma history is missing ${missingHistorical.join(", ")}.`);
  }
  if (!finalMigration || !finalMigrationReady) {
    throw new Error("Cannot baseline safely: ReviewItem does not contain all current FSRS columns.");
  }

  console.log(`[db-repair] target: ${dbPath}`);
  console.log(`[db-repair] migrations to baseline: ${migrationNames.length}`);
  console.log(`[db-repair] current ReviewItem FSRS columns: state, reps, lapses, lastReview`);
  if (!apply) {
    console.log("[db-repair] DRY RUN: no database changes made. Add --apply --yes after reviewing this plan.");
    process.exit(0);
  }

  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `${path.basename(dbPath)}.before-baseline.${stamp}`);
  copyFileSync(dbPath, backupPath);
  if (statSync(dbPath).size !== statSync(backupPath).size) {
    throw new Error(`Backup verification failed: ${backupPath}`);
  }
  db.exec("BEGIN");
  try {
    db.exec("CREATE TABLE IF NOT EXISTS _deeplistener_migrations (name TEXT NOT NULL PRIMARY KEY, applied_at TEXT NOT NULL)");
    const insert = db.prepare("INSERT OR IGNORE INTO _deeplistener_migrations (name, applied_at) VALUES (?, ?)");
    const appliedAt = new Date().toISOString();
    for (const name of migrationNames) insert.run(name, appliedAt);
    db.exec("COMMIT");
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* preserve original failure */ }
    throw error;
  }
  console.log(`[db-repair] APPLIED: runner baseline created; backup=${backupPath}`);
} finally {
  db.close();
}
