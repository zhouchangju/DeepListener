import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import {
  buildUploadTarget,
  buildDerivedAudioTarget,
  getUploadMediaKind,
  resolveStoredUploadPath,
  resolveStoredVideoPath,
  sanitizeUploadFilename,
  validateUploadFileMetadata,
} from "./upload-policy";
import type { RuntimeLayout } from "./runtime-paths";

const LEGACY_ROOT = path.resolve("repo-fixture");

test("sanitizeUploadFilename removes path separators and control characters", () => {
  assert.equal(sanitizeUploadFilename("../evil\ntrack.mp3"), "evil-track.mp3");
  assert.equal(sanitizeUploadFilename("folder\\voice memo?.wav"), "folder-voice-memo-.wav");
  assert.equal(sanitizeUploadFilename("   "), "audio-upload");
});

test("validateUploadFileMetadata accepts common audio files and rejects unsafe uploads", () => {
  assert.deepEqual(validateUploadFileMetadata({ name: "lesson.mp3", type: "audio/mpeg", size: 1024 }), {
    ok: true,
  });
  assert.deepEqual(validateUploadFileMetadata({ name: "lesson.wav", type: "application/octet-stream", size: 1024 }), {
    ok: true,
  });

  assert.equal(validateUploadFileMetadata({ name: "empty.mp3", type: "audio/mpeg", size: 0 }).ok, false);
  assert.equal(validateUploadFileMetadata({ name: "malware.exe", type: "application/x-msdownload", size: 1024 }).ok, false);
  assert.equal(validateUploadFileMetadata({ name: "huge.mp3", type: "audio/mpeg", size: 251 * 1024 * 1024 }).ok, false);
});

test("validateUploadFileMetadata accepts local MP4 and WebM videos with a separate size limit", () => {
  assert.deepEqual(validateUploadFileMetadata({ name: "lecture.mp4", type: "video/mp4", size: 300 * 1024 * 1024 }), {
    ok: true,
  });
  assert.deepEqual(validateUploadFileMetadata({ name: "movie.webm", type: "application/octet-stream", size: 1024 }), {
    ok: true,
  });
  assert.equal(validateUploadFileMetadata({ name: "huge.mp4", type: "video/mp4", size: 1025 * 1024 * 1024 }).ok, false);
  assert.equal(getUploadMediaKind({ name: "lecture.mp4", type: "video/mp4", size: 1 }), "VIDEO");
  assert.equal(getUploadMediaKind({ name: "lesson.mp3", type: "audio/mpeg", size: 1 }), "AUDIO");
});

test("buildUploadTarget stores original videos outside the remotely synced uploads directory", () => {
  const target = buildUploadTarget({
    originalName: "lesson.mp4",
    uniqueId: "fixed-id",
    rootDir: LEGACY_ROOT,
    mediaKind: "VIDEO",
  });

  assert.equal(target.mediaUrl, "/videos/fixed-id-lesson.mp4");
  assert.equal(target.uploadPath, path.join(LEGACY_ROOT, "public", "videos", "fixed-id-lesson.mp4"));
});

test("buildUploadTarget keeps uploads inside public/uploads", () => {
  const target = buildUploadTarget({
    originalName: "../lesson one.mp3",
    uniqueId: "fixed-id",
    rootDir: LEGACY_ROOT,
  });

  assert.equal(target.fileName, "fixed-id-lesson-one.mp3");
  assert.equal(target.audioUrl, "/uploads/fixed-id-lesson-one.mp3");
  assert.equal(target.uploadPath, path.join(LEGACY_ROOT, "public", "uploads", "fixed-id-lesson-one.mp3"));
});

test("resolveStoredUploadPath accepts only stored uploads inside public/uploads", () => {
  assert.equal(
    resolveStoredUploadPath("/uploads/lesson.mp3", LEGACY_ROOT),
    path.join(LEGACY_ROOT, "public", "uploads", "lesson.mp3")
  );
  assert.equal(
    resolveStoredUploadPath("uploads/lesson.mp3", LEGACY_ROOT),
    path.join(LEGACY_ROOT, "public", "uploads", "lesson.mp3")
  );

  assert.equal(resolveStoredUploadPath("/uploads/../../secret.txt", LEGACY_ROOT), null);
  assert.equal(resolveStoredUploadPath("https://example.com/audio.mp3", LEGACY_ROOT), null);
  assert.equal(resolveStoredUploadPath("/other/lesson.mp3", LEGACY_ROOT), null);
});

// --- W1/W2-B: runtime-paths default resolution (PDR-002) -------------------

function freshRoot() {
  return mkdtempSync(path.join(tmpdir(), "deeplistener-upload-test-"));
}

const ORIGINAL_DATA_DIR = process.env.DEEPLISTENER_DATA_DIR;

function desktopLayout(root: string): RuntimeLayout {
  return { root, mode: "desktop" };
}

test("buildUploadTarget: explicit desktop layout writes under <root>/media while keeping /uploads URL", () => {
  const root = freshRoot();
  const target = buildUploadTarget({
    originalName: "lesson one.mp3",
    uniqueId: "fixed-id",
    mediaKind: "AUDIO",
    layout: desktopLayout(root),
  });

  // URL format is unchanged so existing DB records keep resolving.
  assert.equal(target.audioUrl, "/uploads/fixed-id-lesson-one.mp3");
  assert.equal(target.mediaUrl, "/uploads/fixed-id-lesson-one.mp3");
  // Physical path now points at the data-root media dir.
  assert.equal(target.uploadDir, path.join(root, "media", "audio"));
  assert.equal(target.uploadPath, path.join(root, "media", "audio", "fixed-id-lesson-one.mp3"));
});

test("buildUploadTarget: explicit desktop layout routes VIDEO to <root>/media/video with /videos URL", () => {
  const root = freshRoot();
  const target = buildUploadTarget({
    originalName: "lecture.mp4",
    uniqueId: "fixed-id",
    mediaKind: "VIDEO",
    layout: desktopLayout(root),
  });

  assert.equal(target.mediaUrl, "/videos/fixed-id-lecture.mp4");
  assert.equal(target.audioUrl, undefined);
  assert.equal(target.uploadDir, path.join(root, "media", "video"));
  assert.equal(target.uploadPath, path.join(root, "media", "video", "fixed-id-lecture.mp4"));
});

test("buildDerivedAudioTarget: explicit layout derives audio under the same media root", () => {
  const root = freshRoot();
  const target = buildDerivedAudioTarget("clip-123.mp4", undefined, desktopLayout(root));
  assert.equal(target.fileName, "clip-123.mp3");
  assert.equal(target.audioUrl, "/uploads/clip-123.mp3");
  assert.equal(target.uploadPath, path.join(root, "media", "audio", "clip-123.mp3"));
});

test("resolveStoredUploadPath: explicit desktop layout resolves under media/audio", () => {
  const root = freshRoot();
  assert.equal(
    resolveStoredUploadPath("/uploads/song.mp3", undefined, desktopLayout(root)),
    path.join(root, "media", "audio", "song.mp3"),
  );
  // Traversal still rejected under the runtime layout.
  assert.equal(
    resolveStoredUploadPath("/uploads/../etc/passwd", undefined, desktopLayout(root)),
    null,
  );
});

test("resolveStoredVideoPath: explicit desktop layout resolves under media/video", () => {
  const root = freshRoot();
  assert.equal(
    resolveStoredVideoPath("/videos/clip.mp4", undefined, desktopLayout(root)),
    path.join(root, "media", "video", "clip.mp4"),
  );
  assert.equal(
    resolveStoredVideoPath("/videos/../etc/passwd", undefined, desktopLayout(root)),
    null,
  );
});

test("buildUploadTarget default uses DEEPLISTENER_DATA_DIR when no rootDir/layout is passed", () => {
  const root = freshRoot();
  const prev = process.env.DEEPLISTENER_DATA_DIR;
  try {
    process.env.DEEPLISTENER_DATA_DIR = root;
    const target = buildUploadTarget({
      originalName: "lesson.mp3",
      uniqueId: "fixed-id",
      mediaKind: "AUDIO",
    });
    assert.equal(target.audioUrl, "/uploads/fixed-id-lesson.mp3");
    assert.equal(target.uploadPath, path.join(root, "media", "audio", "fixed-id-lesson.mp3"));
  } finally {
    if (prev === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = prev;
  }
});

// Restore env in case any test above leaked (defensive; finally blocks already restore).
test("env is restored after layout tests", () => {
  assert.equal(process.env.DEEPLISTENER_DATA_DIR, ORIGINAL_DATA_DIR);
});
