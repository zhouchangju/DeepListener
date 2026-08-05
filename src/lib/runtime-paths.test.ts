import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import {
  resolveLayout,
  resolveDataRoot,
  isExplicitDataRoot,
  databaseFile,
  databaseUrl,
  uploadsDirectory,
  videosDirectory,
  mediaDirectoryFor,
  resolveStoredMediaPath,
  redactedRuntimeSummary,
  settingsFile,
  type RuntimeLayout,
} from "./runtime-paths";

function freshRoot() {
  return mkdtempSync(path.join(tmpdir(), "deeplistener-rp-test-"));
}

const LEGACY_ROOT = path.resolve("repo-fixture");

function desktopLayout(root: string): RuntimeLayout {
  return { root, mode: "desktop" };
}

function legacyLayout(root: string): RuntimeLayout {
  return { root, mode: "legacy" };
}

test("legacy layout: no DEEPLISTENER_DATA_DIR resolves to cwd and prisma/dev.db", () => {
  const env = {};
  assert.equal(isExplicitDataRoot(env), false);
  const layout = resolveLayout(env, LEGACY_ROOT);
  assert.equal(layout.root, LEGACY_ROOT);
  assert.equal(layout.mode, "legacy");
  assert.equal(databaseFile(layout.root, layout.mode), path.join(LEGACY_ROOT, "prisma", "dev.db"));
  assert.equal(databaseUrl(layout), `file:${databaseFile(layout.root, layout.mode)}`);
  assert.equal(uploadsDirectory(layout.root, layout.mode), path.join(LEGACY_ROOT, "public", "uploads"));
  assert.equal(videosDirectory(layout.root, layout.mode), path.join(LEGACY_ROOT, "public", "videos"));
});

test("explicit Desktop root: DEEPLISTENER_DATA_DIR resolves with new layout", () => {
  const root = freshRoot();
  const env = { DEEPLISTENER_DATA_DIR: root };
  assert.equal(isExplicitDataRoot(env), true);
  const layout = resolveLayout(env);
  assert.equal(layout.root, root);
  assert.equal(layout.mode, "desktop");
  assert.equal(databaseFile(layout.root, layout.mode), path.join(root, "database", "deeplistener.db"));
  assert.equal(databaseUrl(layout), `file:${path.join(root, "database", "deeplistener.db")}`);
  assert.equal(uploadsDirectory(layout.root, layout.mode), path.join(root, "media", "audio"));
  assert.equal(videosDirectory(layout.root, layout.mode), path.join(root, "media", "video"));
  assert.equal(mediaDirectoryFor("audio", layout.root, layout.mode), path.join(root, "media", "audio"));
  assert.equal(mediaDirectoryFor("video", layout.root, layout.mode), path.join(root, "media", "video"));
  assert.equal(settingsFile(root), path.join(root, "settings", "settings.json"));
});

test("explicit root must be absolute; relative value throws", () => {
  const env = { DEEPLISTENER_DATA_DIR: "./relative/data" };
  assert.throws(() => resolveLayout(env), /must be an absolute path/i);
});

test("explicit root is trimmed of surrounding whitespace", () => {
  const root = freshRoot();
  const env = { DEEPLISTENER_DATA_DIR: `  ${root}  ` };
  assert.equal(resolveDataRoot(env), root);
});

test("empty DEEPLISTENER_DATA_DIR falls back to legacy cwd", () => {
  const env = { DEEPLISTENER_DATA_DIR: "   " };
  assert.equal(isExplicitDataRoot(env), false);
  assert.equal(resolveDataRoot(env, LEGACY_ROOT), LEGACY_ROOT);
});

test("resolveStoredMediaPath: desktop /uploads/ URL resolves under media/audio", () => {
  const root = freshRoot();
  const p = resolveStoredMediaPath("/uploads/song.mp3", desktopLayout(root));
  assert.equal(p, path.join(root, "media", "audio", "song.mp3"));
});

test("resolveStoredMediaPath: desktop /videos/ URL resolves under media/video", () => {
  const root = freshRoot();
  const p = resolveStoredMediaPath("/videos/clip.mp4", desktopLayout(root));
  assert.equal(p, path.join(root, "media", "video", "clip.mp4"));
});

test("resolveStoredMediaPath: works without leading slash", () => {
  const root = freshRoot();
  const p = resolveStoredMediaPath("uploads/song.mp3", desktopLayout(root));
  assert.equal(p, path.join(root, "media", "audio", "song.mp3"));
});

test("resolveStoredMediaPath: rejects parent traversal", () => {
  const root = freshRoot();
  assert.equal(resolveStoredMediaPath("/uploads/../etc/passwd", desktopLayout(root)), null);
  assert.equal(resolveStoredMediaPath("/uploads/..%2Fetc", desktopLayout(root)), null);
});

test("resolveStoredMediaPath: rejects backslash and null injection", () => {
  const root = freshRoot();
  assert.equal(resolveStoredMediaPath("/uploads/foo\\bar", desktopLayout(root)), null);
  assert.equal(resolveStoredMediaPath("/uploads/foo\0bar", desktopLayout(root)), null);
});

test("resolveStoredMediaPath: rejects non-media URLs", () => {
  const root = freshRoot();
  assert.equal(resolveStoredMediaPath("/etc/passwd", desktopLayout(root)), null);
  assert.equal(resolveStoredMediaPath("https://evil.com/x.mp3", desktopLayout(root)), null);
  assert.equal(resolveStoredMediaPath("", desktopLayout(root)), null);
});

test("resolveStoredMediaPath: legacy Server root keeps public/uploads layout", () => {
  const p = resolveStoredMediaPath("/uploads/song.mp3", legacyLayout(LEGACY_ROOT));
  assert.equal(p, path.join(LEGACY_ROOT, "public", "uploads", "song.mp3"));
});

test("redactedRuntimeSummary exposes layout without secrets", () => {
  const root = freshRoot();
  const summary = redactedRuntimeSummary(desktopLayout(root));
  assert.equal(summary.dataRoot, root);
  assert.equal(summary.explicit, true);
  assert.ok(summary.databaseFile.endsWith("deeplistener.db"));
  assert.ok(summary.uploadsDirectory.includes("media"));
  // no credential-like fields present
  const json = JSON.stringify(summary).toLowerCase();
  for (const secret of ["apikey", "secret", "token", "password", "credential"]) {
    assert.equal(json.includes(secret), false, `summary must not contain "${secret}"`);
  }
});

test("redactedRuntimeSummary reflects legacy mode correctly", () => {
  const summary = redactedRuntimeSummary(legacyLayout("/repo"));
  assert.equal(summary.explicit, false);
  assert.ok(summary.databaseFile.endsWith("dev.db"));
});
