const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { exportBundle, folderNameForBackupId, stageBundle, verifyBundle } = require("./native-backup.js");

function makeBundle(root, text = "native-backup") {
  const dbPath = path.join(root, "database", "deeplistener.db");
  const mediaPath = path.join(root, "media", "audio", "lesson.mp3");
  mkdirSync(path.dirname(dbPath), { recursive: true });
  mkdirSync(path.dirname(mediaPath), { recursive: true });
  writeFileSync(dbPath, "db");
  writeFileSync(mediaPath, text);
  const entry = (filePath, kind, relative) => ({
    path: relative,
    kind,
    size: Buffer.byteLength(require("node:fs").readFileSync(filePath)),
    sha256: createHash("sha256").update(require("node:fs").readFileSync(filePath)).digest("hex"),
    required: true,
  });
  writeFileSync(path.join(root, "manifest.json"), `${JSON.stringify({
    format: "deeplistener-backup",
    version: 1,
    createdAt: "2026-08-04T00:00:00.000Z",
    sourceMode: "desktop",
    files: [
      entry(dbPath, "database", "database/deeplistener.db"),
      entry(mediaPath, "audio", "media/audio/lesson.mp3"),
    ],
  }, null, 2)}\n`);
}

test("native backup export verifies a Unicode destination copy", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-native-backup-"));
  try {
    const source = path.join(root, "source");
    const destination = path.join(root, "用户备份");
    makeBundle(source);
    const result = await exportBundle(source, destination, "backup-20260804-abc123");
    assert.equal(result.ok, true);
    assert.equal(folderNameForBackupId("backup-20260804-abc123"), "deeplistener-backup-20260804-abc123");
    assert.equal((await verifyBundle(path.join(destination, "deeplistener-backup-20260804-abc123"))).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("native backup staging rejects corrupt bundles and nested source/destination paths", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-native-backup-invalid-"));
  try {
    const source = path.join(root, "source");
    makeBundle(source);
    const nested = path.join(source, "nested");
    assert.equal((await stageBundle(source, nested)).code, "PATH_INVALID");
    writeFileSync(path.join(source, "media", "audio", "lesson.mp3"), "tampered");
    const staging = path.join(root, "staging");
    const result = await stageBundle(source, staging);
    assert.equal(result.ok, false);
    assert.equal((await verifyBundle(source)).code, "INTEGRITY_FAILED");
    assert.equal(require("node:fs").existsSync(staging), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("native backup export does not overwrite an existing destination", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-native-backup-existing-"));
  try {
    const source = path.join(root, "source");
    const destination = path.join(root, "dest");
    makeBundle(source);
    mkdirSync(path.join(destination, "deeplistener-backup-20260804-abc123"), { recursive: true });
    const result = await exportBundle(source, destination, "backup-20260804-abc123");
    assert.deepEqual(result, { ok: false, code: "DESTINATION_EXISTS" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
