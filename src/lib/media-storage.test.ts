import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import path from "node:path";
import {
  mimeFromExtension,
  resolveMedia,
  resolveExistingMedia,
  mediaDirectoryForKind,
} from "./media-storage";
import type { RuntimeLayout } from "./runtime-paths";

function freshRoot() {
  return mkdtempSync(join(tmpdir(), "deeplistener-media-test-"));
}

function desktopLayout(root: string): RuntimeLayout {
  return { root, mode: "desktop" };
}

function legacyLayout(root: string): RuntimeLayout {
  return { root, mode: "legacy" };
}

function createDirectoryLink(target: string, linkPath: string): boolean {
  try {
    // Directory junctions are the Windows equivalent available without
    // requiring Developer Mode/admin symlink privileges. POSIX uses a normal
    // directory symlink. Both exercise the canonical containment check.
    symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (process.platform === "win32" && (code === "EPERM" || code === "EACCES")) {
      return false;
    }
    throw error;
  }
}

test("mimeFromExtension maps common audio/video extensions", () => {
  assert.equal(mimeFromExtension("song.mp3"), "audio/mpeg");
  assert.equal(mimeFromExtension("clip.wav"), "audio/wav");
  assert.equal(mimeFromExtension("clip.WAV"), "audio/wav");
  assert.equal(mimeFromExtension("track.ogg"), "audio/ogg");
  assert.equal(mimeFromExtension("track.opus"), "audio/opus");
  assert.equal(mimeFromExtension("movie.mp4"), "video/mp4");
  assert.equal(mimeFromExtension("movie.webm"), "video/webm");
  assert.equal(mimeFromExtension("unknown.xyz"), "application/octet-stream");
  assert.equal(mimeFromExtension("noext"), "application/octet-stream");
});

test("mediaDirectoryForKind uses runtime media layout", () => {
  const root = freshRoot();
  assert.equal(
    mediaDirectoryForKind("audio", desktopLayout(root)),
    join(root, "media", "audio"),
  );
  assert.equal(
    mediaDirectoryForKind("video", desktopLayout(root)),
    join(root, "media", "video"),
  );
  assert.equal(
    mediaDirectoryForKind("audio", legacyLayout(root)),
    join(root, "public", "uploads"),
  );
});

test("resolveMedia resolves /uploads/ URL to audio media dir (desktop)", () => {
  const root = freshRoot();
  const result = resolveMedia("/uploads/song.mp3", desktopLayout(root));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.path, join(root, "media", "audio", "song.mp3"));
    assert.equal(result.kind, "audio");
    assert.equal(result.mime, "audio/mpeg");
  }
});

test("resolveMedia resolves /videos/ URL to video media dir (desktop)", () => {
  const root = freshRoot();
  const result = resolveMedia("/videos/clip.mp4", desktopLayout(root));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.path, join(root, "media", "video", "clip.mp4"));
    assert.equal(result.kind, "video");
    assert.equal(result.mime, "video/mp4");
  }
});

test("resolveMedia keeps legacy public/uploads layout", () => {
  const legacyRoot = path.resolve("repo-fixture");
  const result = resolveMedia("/uploads/song.mp3", legacyLayout(legacyRoot));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.path, join(legacyRoot, "public", "uploads", "song.mp3"));
  }
});

test("resolveMedia rejects traversal and non-media URLs without touching the filesystem", () => {
  const root = freshRoot();
  const layout = desktopLayout(root);
  assert.deepEqual(resolveMedia("/uploads/../etc/passwd", layout), {
    ok: false,
    reason: "invalid-url",
  });
  assert.deepEqual(resolveMedia("/uploads/foo\\bar", layout), {
    ok: false,
    reason: "invalid-url",
  });
  assert.deepEqual(resolveMedia("/etc/passwd", layout), {
    ok: false,
    reason: "invalid-url",
  });
  assert.deepEqual(resolveMedia("https://evil.com/x.mp3", layout), {
    ok: false,
    reason: "invalid-url",
  });
  assert.deepEqual(resolveMedia("", layout), {
    ok: false,
    reason: "invalid-url",
  });
});

test("resolveExistingMedia returns not-found for missing files", async () => {
  const root = freshRoot();
  const result = await resolveExistingMedia("/uploads/missing.mp3", desktopLayout(root));
  assert.deepEqual(result, { ok: false, reason: "not-found" });
});

test("resolveExistingMedia returns resolved path for present files", async () => {
  const root = freshRoot();
  const audioDir = join(root, "media", "audio");
  mkdirSync(audioDir, { recursive: true });
  writeFileSync(join(audioDir, "song.mp3"), "audio-bytes");

  const result = await resolveExistingMedia("/uploads/song.mp3", desktopLayout(root));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.kind, "audio");
    assert.equal(result.mime, "audio/mpeg");
    assert.ok(result.path.endsWith(join("media", "audio", "song.mp3")));
  }
});

test("resolveExistingMedia rejects a symlink that escapes the media directory (PDR-003)", async (t) => {
  const root = freshRoot();
  const audioDir = join(root, "media", "audio");
  mkdirSync(audioDir, { recursive: true });

  // A secret file OUTSIDE the media root.
  const secretDir = join(root, "outside");
  mkdirSync(secretDir, { recursive: true });
  writeFileSync(join(secretDir, "secret.txt"), "top-secret");

  // A link planted INSIDE the media dir that points outside. Use a directory
  // link so the test remains runnable on Windows without symlink privileges.
  if (!createDirectoryLink(secretDir, join(audioDir, "escape"))) {
    t.skip("Windows symlink/junction creation is unavailable in this environment");
    return;
  }

  const result = await resolveExistingMedia("/uploads/escape/secret.txt", desktopLayout(root));
  assert.deepEqual(result, { ok: false, reason: "not-found" });
});

test("resolveExistingMedia accepts a symlink that stays inside the media directory", async (t) => {
  const root = freshRoot();
  const audioDir = join(root, "media", "audio");
  mkdirSync(audioDir, { recursive: true });
  const realDir = join(audioDir, "real");
  mkdirSync(realDir, { recursive: true });
  writeFileSync(join(realDir, "real.mp3"), "audio-bytes");
  // Internal directory link — canonical target remains under media/audio.
  if (!createDirectoryLink(realDir, join(audioDir, "alias"))) {
    t.skip("Windows symlink/junction creation is unavailable in this environment");
    return;
  }

  const result = await resolveExistingMedia("/uploads/alias/real.mp3", desktopLayout(root));
  assert.equal(result.ok, true);
});

test("resolveMedia is pure: never throws and never reads the filesystem", () => {
  // Non-existent root dir — pure resolution must still succeed lexically.
  const result = resolveMedia(
    "/uploads/song.mp3",
    desktopLayout(path.resolve("definitely", "does", "not", "exist")),
  );
  assert.equal(result.ok, true);
});
