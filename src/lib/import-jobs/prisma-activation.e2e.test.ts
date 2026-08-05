import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { attachImportSubtitle, createImportJob } from "./create";
import { migrateDatabase, type SqliteConnection } from "../migration-runner";
import { runImportJob } from "./run";

function source(name: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  return { name, type, size: blob.size, stream: blob.stream() };
}

test("disposable Prisma activation creates exactly one Track across resume calls", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-prisma-activation-"));
  const layout = { root, mode: "desktop" as const };
  const dbFile = path.join(root, "database", "deeplistener.db");
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const migration = await migrateDatabase(
    dbFile,
    async (file) => new DatabaseSync(file) as unknown as SqliteConnection,
    migrationsDir,
  );
  assert.equal(migration.ok, true, `disposable migration failed: ${JSON.stringify(migration)}`);

  const database = new PrismaClient({ datasources: { db: { url: `file:${dbFile}` } } });
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    await attachImportSubtitle(
      job.id,
      source("lesson.srt", "1\n00:00:00,000 --> 00:00:01,000\nHello learner", "application/x-subrip"),
      layout,
    );

    const first = await runImportJob(job.id, undefined, layout, database);
    assert.equal(first.status, "ACTIVATED");
    assert.ok(first.trackId);

    const second = await runImportJob(job.id, undefined, layout, database);
    assert.equal(second.status, "ACTIVATED");
    assert.equal(second.trackId, first.trackId);
    assert.equal(await database.track.count(), 1);
    assert.equal(await database.sentence.count(), 1);
  } finally {
    await database.$disconnect();
    await rm(root, { recursive: true, force: true });
  }
});
