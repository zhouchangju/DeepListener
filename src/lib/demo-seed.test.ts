import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { seedDemoTrack, removeDemoTracks, demoTrackExists, DEMO_TRACK_TYPE } from "./demo-seed";
import { migrateDatabase, type SqliteConnection } from "./migration-runner";

/**
 * Demo seed tests (W3 T192, DFS-004 isolation/removal).
 *
 * Run against a DISPOSABLE SQLite database under mktemp — never the active
 * prisma/dev.db. The disposable PrismaClient is passed directly to each
 * demo-seed function.
 */
const ORIGINAL_ENV = { ...process.env };
let dataRoot: string;
let dbFile: string;
let db: PrismaClient;

before(async () => {
  dataRoot = mkdtempSync(join(tmpdir(), "deeplistener-demo-seed-"));
  mkdirSync(join(dataRoot, "database"), { recursive: true });
  dbFile = join(dataRoot, "database", "deeplistener.db");
  process.env.DEEPLISTENER_DATA_DIR = dataRoot;
  process.env.DATABASE_URL = `file:${dbFile}`;
  // Initialize only the disposable database. Do not depend on a system
  // `sqlite3` CLI or Prisma's schema-engine binary: clean Windows installs
  // commonly have neither. Reuse the project's offline migration runner,
  // which is the same no-shell path used by Desktop startup.
  const migrationsDir = join(process.cwd(), "prisma", "migrations");
  const result = await migrateDatabase(
    dbFile,
    async (file) => new DatabaseSync(file) as unknown as SqliteConnection,
    migrationsDir,
  );
  assert.equal(result.ok, true, `disposable schema setup failed: ${JSON.stringify(result)}`);
  db = new PrismaClient();
});

after(async () => {
  await db?.$disconnect().catch(() => {});
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
  if (dataRoot) rmSync(dataRoot, { recursive: true, force: true });
});

test("seedDemoTrack creates the demo track with sentences and DEMO ownership", async () => {
  const result = await seedDemoTrack(db);
  assert.equal(result.seeded, true);
  assert.equal(result.trackId, "demo-listening-001");
  assert.equal(result.sentenceCount, 2);

  const track = await db.track.findUnique({
    where: { id: "demo-listening-001" },
    include: { sentences: true },
  });
  assert.equal(track?.trackType, DEMO_TRACK_TYPE);
  assert.equal(track?.sentences.length, 2);
  assert.equal(track?.audioUrl, "/demo/demo-listening.mp3");
});

test("seedDemoTrack is idempotent — second call is a no-op", async () => {
  const first = await seedDemoTrack(db);
  const second = await seedDemoTrack(db);
  assert.equal(first.seeded, false); // already seeded by previous test
  assert.equal(second.seeded, false);
  assert.equal(second.trackId, first.trackId);
  // still exactly one demo track
  const count = await db.track.count({ where: { trackType: DEMO_TRACK_TYPE } });
  assert.equal(count, 1);
});

test("removeDemoTracks removes ONLY demo tracks, leaving personal tracks intact (DFS-004)", async () => {
  // create a personal track that must survive demo removal
  const personal = await db.track.create({
    data: {
      title: "My personal podcast",
      audioUrl: "/uploads/personal.mp3",
      transcription: "[]",
      trackType: null,
      sentences: { create: [{ text: "hi", startTime: 0, endTime: 1, orderIndex: 0 }] },
    },
    include: { sentences: true },
  });

  const result = await removeDemoTracks(db);
  assert.equal(result.removedTracks, 1);

  // personal track + its sentence survive
  const surviving = await db.track.findUnique({
    where: { id: personal.id },
    include: { sentences: true },
  });
  assert.equal(surviving?.title, "My personal podcast");
  assert.equal(surviving?.sentences.length, 1);

  // demo track is gone
  const demoLeft = await db.track.findUnique({ where: { id: "demo-listening-001" } });
  assert.equal(demoLeft, null);
});

test("demoTrackExists reflects seeding/removal state", async () => {
  assert.equal(await demoTrackExists(db), false);
  await seedDemoTrack(db);
  assert.equal(await demoTrackExists(db), true);
  await removeDemoTracks(db);
  assert.equal(await demoTrackExists(db), false);
});
