import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrateDatabase, type SqliteConnection } from "./migration-runner";
import { activateLegacyImport, stageLegacyImport } from "./legacy-import";

const MIGRATIONS = path.resolve(process.cwd(), "prisma", "migrations");

function opener(filePath: string): Promise<SqliteConnection> {
  return Promise.resolve(new DatabaseSync(filePath) as unknown as SqliteConnection);
}

function tempRoot(prefix: string) {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

function digest(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function createLegacyFixture() {
  const fixture = tempRoot("deeplistener-legacy-import-");
  const dbPath = path.join(fixture.root, "prisma", "dev.db");
  const audioPath = path.join(fixture.root, "public", "uploads", "lesson.mp3");
  const videoPath = path.join(fixture.root, "public", "videos", "lesson.mp4");
  mkdirSync(path.dirname(audioPath), { recursive: true });
  mkdirSync(path.dirname(videoPath), { recursive: true });
  writeFileSync(audioPath, Buffer.from("audio-fixture"));
  writeFileSync(videoPath, Buffer.from("video-fixture"));
  const migration = await migrateDatabase(dbPath, opener, MIGRATIONS);
  assert.equal(migration.ok, true, `fixture migration failed: ${JSON.stringify(migration)}`);
  return {
    ...fixture,
    dbPath,
    audioPath,
    videoPath,
    hashes: { db: digest(dbPath), audio: digest(audioPath), video: digest(videoPath) },
  };
}

test("stages a legacy copy, migrates only staging, and leaves target absent", async () => {
  const source = await createLegacyFixture();
  const target = tempRoot("deeplistener-target-");
  try {
    const result = await stageLegacyImport({ sourceRoot: source.root, targetRoot: path.join(target.root, "data"), migrationsDir: MIGRATIONS });
    assert.equal(result.ok, true, `expected staged import: ${JSON.stringify(result)}`);
    if (!result.ok) return;
    assert.equal(result.stage.migration.applied.length, 0, "current legacy fixture should be idempotent");
    assert.equal(existsSync(path.join(target.root, "data")), false);
    assert.equal(digest(source.dbPath), source.hashes.db);
    assert.equal(digest(source.audioPath), source.hashes.audio);
    assert.equal(digest(source.videoPath), source.hashes.video);

    const activation = await activateLegacyImport({ stage: result.stage, confirmReplace: false });
    assert.equal(activation.ok, true);
    assert.equal(digest(path.join(target.root, "data", "database", "deeplistener.db")), source.hashes.db);
    assert.equal(digest(path.join(target.root, "data", "media", "audio", "lesson.mp3")), source.hashes.audio);
    assert.equal(digest(path.join(target.root, "data", "media", "video", "lesson.mp4")), source.hashes.video);
  } finally {
    source.dispose();
    target.dispose();
  }
});

test("conflicting target requires explicit confirmation and preserves it before activation", async () => {
  const source = await createLegacyFixture();
  const target = tempRoot("deeplistener-target-conflict-");
  try {
    const targetDb = path.join(target.root, "data", "database", "deeplistener.db");
    mkdirSync(path.dirname(targetDb), { recursive: true });
    writeFileSync(targetDb, "existing-target");
    const before = digest(targetDb);
    const staged = await stageLegacyImport({ sourceRoot: source.root, targetRoot: path.join(target.root, "data"), migrationsDir: MIGRATIONS });
    assert.equal(staged.ok, true);
    if (!staged.ok) return;
    const blocked = await activateLegacyImport({ stage: staged.stage, confirmReplace: false });
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.equal(blocked.reason, "confirmation-required");
    assert.equal(digest(targetDb), before);
    const activated = await activateLegacyImport({ stage: staged.stage, confirmReplace: true });
    assert.equal(activated.ok, true);
    if (activated.ok) assert.ok(activated.previousRoot);
  } finally {
    source.dispose();
    target.dispose();
  }
});

test("migration failure discards staging and preserves source and target", async () => {
  const source = await createLegacyFixture();
  const target = tempRoot("deeplistener-target-failure-");
  const fake = tempRoot("deeplistener-fake-migrations-");
  try {
    const migrationDir = path.join(fake.root, "20260101000000_bad");
    mkdirSync(migrationDir, { recursive: true });
    writeFileSync(path.join(migrationDir, "migration.sql"), "INSERT INTO missing_table VALUES (1);", "utf8");
    const result = await stageLegacyImport({ sourceRoot: source.root, targetRoot: path.join(target.root, "data"), migrationsDir: fake.root });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "migration-failed");
    assert.equal(existsSync(path.join(target.root, "data")), false);
    assert.equal(digest(source.dbPath), source.hashes.db);
  } finally {
    source.dispose();
    target.dispose();
    fake.dispose();
  }
});

test("rejects non-absolute or identical source and target roots before filesystem work", async () => {
  const result = await stageLegacyImport({ sourceRoot: "relative-source", targetRoot: "relative-target" });
  assert.deepEqual(result, { ok: false, reason: "source-invalid" });
});
