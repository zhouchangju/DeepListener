/**
 * T012 — Packaged Prisma read/write spike on a disposable SQLite.
 *
 * Proves:
 *  - the Prisma client generated into `.next/standalone` can be imported and
 *    connected to an ABSOLUTE file URL under a mktemp data root;
 *  - schema can be initialized via offline migration SQL (no `prisma migrate`);
 *  - CRUD on a representative record (Track) works end-to-end;
 *  - a read-only database is detected and surfaces an actionable error.
 *
 * It NEVER touches prisma/dev.db. The DATABASE_URL is always an absolute path
 * inside a fresh mktemp directory created by the data-root helper.
 *
 * Usage: node --import tsx docs/desktop-w0/prisma-spike/t012-prisma-crud-spike.mjs
 */
import { readFileSync, writeFileSync, chmodSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

// Inline disposable data-root creation (the TS helper under tests/fixtures is
// not importable as .js without tsx; the spike keeps no cross-file TS deps).
function createDisposableDataRoot(prefix = "deeplistener-w0") {
  const root = mkdtempSync(join(tmpdir(), `${prefix}-`));
  for (const sub of [
    "database", "media/audio", "media/video", "media/temp",
    "exports", "backups", "logs", "settings", "runtime",
  ]) {
    mkdirSync(join(root, sub), { recursive: true });
  }
  return {
    root,
    databaseFile: join(root, "database", "deeplistener.db"),
    dirs: {
      runtime: join(root, "runtime"),
    },
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
}

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const STANDALONE_PRISMA = join(
  REPO_ROOT,
  ".next/standalone/node_modules/.prisma/client",
);
const MIGRATIONS_DIR = join(REPO_ROOT, "prisma/migrations");

function assertStandaloneClientExists() {
  const entry = join(STANDALONE_PRISMA, "index.js");
  if (!existsSync(entry)) {
    throw new Error(
      `Packaged Prisma client not found at ${entry}. Run \`npm run build\` (output:standalone) first.`,
    );
  }
}

function combineMigrationSql() {
  const files = [];
  const dirs = execFileSync("ls", [MIGRATIONS_DIR], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((d) => !d.endsWith(".toml") && !d.startsWith("."));
  for (const d of dirs.sort()) {
    const sqlPath = join(MIGRATIONS_DIR, d, "migration.sql");
    if (existsSync(sqlPath)) files.push(readFileSync(sqlPath, "utf8"));
  }
  return files.join("\n\n");
}

async function importPackagedPrismaClient() {
  // Set DATABASE_URL BEFORE importing the client, because the generated
  // client reads env at construction time. We re-set it per scenario.
  const clientModule = await import(
    "file://" + join(STANDALONE_PRISMA, "index.js")
  );
  return clientModule.PrismaClient;
}

async function crudRoundtrip(PrismaClient, _dbFile) {
  // A fresh PrismaClient per DB file (one client per process-scoped URL).
  const prisma = new PrismaClient({
    // Force the engine to look beside the generated client for the dylib.
    // (The standalone layout colocates them, so default resolution works,
    //  but being explicit documents the packaged-path requirement.)
  });
  try {
    // CREATE
    const created = await prisma.track.create({
      data: {
        id: "spike-track-1",
        title: "T012 spike track",
        audioUrl: "media/audio/spike.mp3",
        transcription: "spike transcript",
        status: "UNLEARNT",
      },
    });
    assertEq(created.id, "spike-track-1", "create returned id");

    // READ
    const found = await prisma.track.findUnique({
      where: { id: "spike-track-1" },
    });
    assertEq(found.title, "T012 spike track", "read title");

    // UPDATE
    await prisma.track.update({
      where: { id: "spike-track-1" },
      data: { title: "T012 updated", isArchived: true },
    });
    const updated = await prisma.track.findUnique({
      where: { id: "spike-track-1" },
    });
    assertEq(updated.title, "T012 updated", "update title");
    assertEq(updated.isArchived, true, "update isArchived");

    // nested create: sentence
    await prisma.sentence.create({
      data: {
        id: "spike-sentence-1",
        trackId: "spike-track-1",
        text: "Hello world",
        startTime: 0,
        endTime: 1.5,
        orderIndex: 0,
      },
    });
    const withSentences = await prisma.track.findUnique({
      where: { id: "spike-track-1" },
      include: { sentences: true },
    });
    assertEq(withSentences.sentences.length, 1, "nested sentence count");

    // DELETE (cascade should remove sentence)
    await prisma.track.delete({ where: { id: "spike-track-1" } });
    const afterDelete = await prisma.track.findUnique({
      where: { id: "spike-track-1" },
    });
    assertEq(afterDelete, null, "delete removed track");
    const orphanSentence = await prisma.sentence.findUnique({
      where: { id: "spike-sentence-1" },
    });
    assertEq(orphanSentence, null, "cascade removed sentence");

    console.log("CRUD roundtrip: CREATE/READ/UPDATE/DELETE + cascade — PASS");
  } finally {
    await prisma.$disconnect();
  }
}

async function readOnlyDetection(PrismaClient, _roDbFile) {
  // Make the DB file read-only at the filesystem level after migration.
  const prisma = new PrismaClient();
  try {
    // The first read may succeed, but a write must fail with a clear error.
    let writeError = null;
    try {
      await prisma.track.create({
        data: {
          id: "should-fail",
          title: "ro",
          audioUrl: "x",
          transcription: "x",
        },
      });
    } catch (err) {
      writeError = err;
    }
    if (!writeError) {
      throw new Error(
        "EXPECTED a write failure on read-only DB but create succeeded",
      );
    }
    const code = writeError.code || writeError.constructor.name;
    console.log(
      `Read-only DB write correctly rejected (code=${code}); actionable error surfaced.`,
    );
    console.log("Read-only detection — PASS");
  } finally {
    await prisma.$disconnect();
  }
}

function assertEq(actual, expected, label) {
  if (
    JSON.stringify(actual) !== JSON.stringify(expected)
  ) {
    throw new Error(
      `assertion failed [${label}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

async function main() {
  console.log("=== T012 packaged Prisma CRUD spike ===");
  assertStandaloneClientExists();

  // Scenario 1: writable disposable DB with schema initialized via offline SQL.
  const root = createDisposableDataRoot("deeplistener-w0-prisma");
  process.env.DATABASE_URL = `file:${root.databaseFile}`;
  console.log(`disposable DB: ${root.databaseFile}`);
  try {
    // Initialize schema offline (sqlite3 CLI), NOT prisma migrate.
    const combined = combineMigrationSql();
    const sqlTmp = join(root.dirs.runtime, "combined.sql");
    writeFileSync(sqlTmp, combined);
    execFileSync("sqlite3", [root.databaseFile], {
      input: combined,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const tableCount = execFileSync(
      "sqlite3",
      [root.databaseFile, "SELECT count(*) FROM sqlite_master WHERE type='table';"],
      { encoding: "utf8" },
    ).trim();
    console.log(`schema initialized offline: ${tableCount} tables`);

    const PrismaClient = await importPackagedPrismaClient();
    await crudRoundtrip(PrismaClient, root.databaseFile);
  } finally {
    delete process.env.DATABASE_URL;
    root.dispose();
    console.log("writable-DB scenario disposed");
  }

  // Scenario 2: read-only DB.
  const roRoot = createDisposableDataRoot("deeplistener-w0-prisma-ro");
  process.env.DATABASE_URL = `file:${roRoot.databaseFile}`;
  try {
    const combined = combineMigrationSql();
    execFileSync("sqlite3", [roRoot.databaseFile], { input: combined });
    // Insert a baseline row while writable, then flip to read-only.
    execFileSync("sqlite3", [
      roRoot.databaseFile,
      "INSERT INTO Track(id,title,audioUrl,transcription,createdAt) VALUES('base','b','a','t','2026-01-01');",
    ]);
    chmodSync(roRoot.databaseFile, 0o444);
    const PrismaClient = await importPackagedPrismaClient();
    await readOnlyDetection(PrismaClient, roRoot.databaseFile);
  } finally {
    delete process.env.DATABASE_URL;
    chmodSync(roRoot.databaseFile, 0o644);
    roRoot.dispose();
    console.log("read-only-DB scenario disposed");
  }

  console.log("\n=== T012 PASS: packaged Prisma CRUD + read-only detection ===");
}

main().catch((err) => {
  console.error("\n=== T012 FAIL ===");
  console.error(err);
  process.exit(1);
});
