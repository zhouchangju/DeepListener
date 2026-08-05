import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  activateRestore,
  createBackup,
  discardRestoreStage,
  stageRestore,
  validateBackup,
} from "./backup-service";
import type { RuntimeLayout } from "./runtime-paths";

function freshRoot(prefix = "deeplistener-backup-test-") {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

function desktopLayout(root: string): RuntimeLayout {
  return { root, mode: "desktop" };
}

function seedRoot(root: string, marker: string): void {
  mkdirSync(path.join(root, "database"), { recursive: true });
  mkdirSync(path.join(root, "media", "audio"), { recursive: true });
  mkdirSync(path.join(root, "media", "video"), { recursive: true });
  const db = new DatabaseSync(path.join(root, "database", "deeplistener.db"));
  db.exec("CREATE TABLE marker(value TEXT); INSERT INTO marker VALUES ('" + marker + "');");
  db.close();
  writeFileSync(path.join(root, "media", "audio", "lesson.mp3"), `audio-${marker}`);
  writeFileSync(path.join(root, "media", "video", "lesson.mp4"), `video-${marker}`);
}

test("createBackup writes a portable manifest with checksummed database and media", async () => {
  const source = freshRoot();
  const workspace = freshRoot();
  try {
    seedRoot(source.root, "source");
    const result = await createBackup({
      source: desktopLayout(source.root),
      destination: path.join(workspace.root, "lesson.deeplistener-backup"),
      appVersion: "0.2.0",
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) return;
    assert.equal(result.manifest.format, "deeplistener-backup");
    assert.equal(result.manifest.sourceMode, "desktop");
    assert.equal(result.manifest.appVersion, "0.2.0");
    assert.deepEqual(
      result.manifest.files.map((entry) => entry.path).sort(),
      ["database/deeplistener.db", "media/audio/lesson.mp3", "media/video/lesson.mp4"],
    );
    assert.ok(result.manifest.files.every((entry) => !path.isAbsolute(entry.path)));
    assert.doesNotMatch(readFileSync(path.join(result.backupPath, "manifest.json"), "utf8"), new RegExp(source.root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const validation = await validateBackup(result.backupPath);
    assert.equal(validation.ok, true, JSON.stringify(validation));
  } finally {
    source.dispose();
    workspace.dispose();
  }
});

test("validateBackup rejects a changed media file before restore", async () => {
  const source = freshRoot();
  const workspace = freshRoot();
  try {
    seedRoot(source.root, "source");
    const result = await createBackup({ source: desktopLayout(source.root), destination: path.join(workspace.root, "bundle") });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    writeFileSync(path.join(result.backupPath, "media", "audio", "lesson.mp3"), "tampered");
    const validation = await validateBackup(result.backupPath);
    assert.deepEqual(validation, { ok: false, reason: "integrity-failed" });
  } finally {
    source.dispose();
    workspace.dispose();
  }
});

test("restore stages first, requires explicit conflict confirmation, then keeps a rollback root", async () => {
  const source = freshRoot();
  const workspace = freshRoot();
  const target = path.join(workspace.root, "profile");
  try {
    seedRoot(source.root, "source");
    seedRoot(target, "existing");
    const backup = await createBackup({ source: desktopLayout(source.root), destination: path.join(workspace.root, "bundle") });
    assert.equal(backup.ok, true);
    if (!backup.ok) return;

    const staged = await stageRestore({ backupPath: backup.backupPath, targetRoot: target });
    assert.equal(staged.ok, true, JSON.stringify(staged));
    if (!staged.ok) return;
    assert.equal(staged.status, "conflict");
    assert.ok(staged.stage.conflicts.includes("database/deeplistener.db"));
    const blocked = await activateRestore({ stage: staged.stage, confirmReplace: false });
    assert.deepEqual(blocked.reason, "confirmation-required");
    assert.match(readFileSync(path.join(target, "media", "audio", "lesson.mp3"), "utf8"), /existing/);
    assert.equal(await discardRestoreStage(staged.stage.stagingPath), true);

    const stagedAgain = await stageRestore({ backupPath: backup.backupPath, targetRoot: target });
    assert.equal(stagedAgain.ok, true);
    if (!stagedAgain.ok) return;
    const activated = await activateRestore({ stage: stagedAgain.stage, confirmReplace: true });
    assert.equal(activated.ok, true, JSON.stringify(activated));
    if (!activated.ok) return;
    assert.match(readFileSync(path.join(target, "media", "audio", "lesson.mp3"), "utf8"), /source/);
    assert.ok(activated.previousRoot, "the old root must remain recoverable");
    assert.match(readFileSync(path.join(activated.previousRoot!, "media", "audio", "lesson.mp3"), "utf8"), /existing/);
  } finally {
    source.dispose();
    workspace.dispose();
  }
});

test("corrupt backup cannot stage and leaves target unchanged", async () => {
  const source = freshRoot();
  const workspace = freshRoot();
  const target = path.join(workspace.root, "profile");
  try {
    seedRoot(source.root, "source");
    seedRoot(target, "existing");
    const backup = await createBackup({ source: desktopLayout(source.root), destination: path.join(workspace.root, "bundle") });
    assert.equal(backup.ok, true);
    if (!backup.ok) return;
    writeFileSync(path.join(backup.backupPath, "database", "deeplistener.db"), "not-sqlite");
    const staged = await stageRestore({ backupPath: backup.backupPath, targetRoot: target });
    assert.equal(staged.ok, false);
    assert.equal(readFileSync(path.join(target, "media", "audio", "lesson.mp3"), "utf8"), "audio-existing");
  } finally {
    source.dispose();
    workspace.dispose();
  }
});

test("backup rejects a media symlink that escapes the source root", async (t) => {
  const source = freshRoot();
  const workspace = freshRoot();
  try {
    seedRoot(source.root, "source");
    const outside = freshRoot();
    try {
      writeFileSync(path.join(outside.root, "secret.mp3"), "secret");
      try {
        symlinkSync(path.join(outside.root, "secret.mp3"), path.join(source.root, "media", "audio", "escape.mp3"));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (process.platform === "win32" && (code === "EPERM" || code === "EACCES")) {
          t.skip("symlink creation is unavailable in this Windows environment");
          return;
        }
        throw error;
      }
      const result = await createBackup({ source: desktopLayout(source.root), destination: path.join(workspace.root, "bundle") });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "source-not-readable");
    } finally {
      outside.dispose();
    }
  } finally {
    source.dispose();
    workspace.dispose();
  }
});
