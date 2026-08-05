import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GET, POST } from "./route";

function seed(root: string): void {
  mkdirSync(path.join(root, "database"), { recursive: true });
  mkdirSync(path.join(root, "media", "audio"), { recursive: true });
  const db = new DatabaseSync(path.join(root, "database", "deeplistener.db"));
  db.exec("CREATE TABLE marker(value TEXT); INSERT INTO marker VALUES ('route');");
  db.close();
  writeFileSync(path.join(root, "media", "audio", "lesson.mp3"), "audio-route");
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/backups", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

test("backups API creates and lists only valid local backup metadata", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-backup-route-"));
  const oldRoot = process.env.DEEPLISTENER_DATA_DIR;
  try {
    process.env.DEEPLISTENER_DATA_DIR = root;
    seed(root);
    const created = await POST(jsonRequest({ action: "create" }));
    assert.equal(created.status, 201);
    const payload = await created.json() as { backup: { id: string; fileCount: number } };
    assert.match(payload.backup.id, /^backup-/);
    assert.equal(payload.backup.fileCount, 2);
    const listed = await GET();
    assert.equal(listed.status, 200);
    const listPayload = await listed.json() as { backups: Array<{ id: string }> };
    assert.deepEqual(listPayload.backups.map((entry) => entry.id), [payload.backup.id]);
  } finally {
    if (oldRoot === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = oldRoot;
    rmSync(root, { recursive: true, force: true });
  }
});

test("backups API stages a conflicting restore and requires explicit confirmation", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-backup-restore-route-"));
  const oldRoot = process.env.DEEPLISTENER_DATA_DIR;
  try {
    process.env.DEEPLISTENER_DATA_DIR = root;
    seed(root);
    const created = await POST(jsonRequest({ action: "create" }));
    assert.equal(created.status, 201);
    const payload = await created.json() as { backup: { id: string } };
    const staged = await POST(jsonRequest({ action: "restore", backupId: payload.backup.id }));
    assert.equal(staged.status, 409);
    const stagePayload = await staged.json() as { status: string; restoreId: string; conflicts: string[] };
    assert.equal(stagePayload.status, "conflict");
    assert.ok(stagePayload.conflicts.includes("database/deeplistener.db"));
    const blocked = await POST(jsonRequest({ action: "restore", backupId: payload.backup.id, stageId: stagePayload.restoreId, confirmReplace: false }));
    assert.equal(blocked.status, 409);
    assert.equal((await blocked.json()).reason, "confirmation-required");
  } finally {
    if (oldRoot === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = oldRoot;
    rmSync(root, { recursive: true, force: true });
  }
});

test("backups API validates and promotes an imported staging bundle", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-backup-import-route-"));
  const oldRoot = process.env.DEEPLISTENER_DATA_DIR;
  try {
    process.env.DEEPLISTENER_DATA_DIR = root;
    seed(root);
    const created = await POST(jsonRequest({ action: "create" }));
    assert.equal(created.status, 201);
    const createdPayload = await created.json() as { backup: { id: string } };
    const stagingId = ".deeplistener-backup-import-route-test";
    cpSync(path.join(root, "backups", createdPayload.backup.id), path.join(root, "backups", stagingId), { recursive: true });
    const imported = await POST(jsonRequest({ action: "import", stagingId }));
    assert.equal(imported.status, 201);
    const importedPayload = await imported.json() as { imported: boolean; backup: { id: string } };
    assert.equal(importedPayload.imported, true);
    assert.match(importedPayload.backup.id, /^backup-/);
    assert.equal((await GET()).status, 200);
    assert.equal((await (await GET()).json() as { backups: unknown[] }).backups.length, 2);
  } finally {
    if (oldRoot === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = oldRoot;
    rmSync(root, { recursive: true, force: true });
  }
});

test("backups API removes an invalid imported staging bundle without touching active data", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-backup-import-invalid-route-"));
  const oldRoot = process.env.DEEPLISTENER_DATA_DIR;
  try {
    process.env.DEEPLISTENER_DATA_DIR = root;
    seed(root);
    const stagingId = ".deeplistener-backup-import-invalid";
    mkdirSync(path.join(root, "backups", stagingId), { recursive: true });
    writeFileSync(path.join(root, "backups", stagingId, "manifest.json"), "{}");
    const imported = await POST(jsonRequest({ action: "import", stagingId }));
    assert.equal(imported.status, 409);
    assert.equal(require("node:fs").existsSync(path.join(root, "backups", stagingId)), false);
    assert.equal(require("node:fs").existsSync(path.join(root, "database", "deeplistener.db")), true);
  } finally {
    if (oldRoot === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = oldRoot;
    rmSync(root, { recursive: true, force: true });
  }
});
