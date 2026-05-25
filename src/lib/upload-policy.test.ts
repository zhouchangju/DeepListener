import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  buildUploadTarget,
  resolveStoredUploadPath,
  sanitizeUploadFilename,
  validateUploadFileMetadata,
} from "./upload-policy";

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

test("buildUploadTarget keeps uploads inside public/uploads", () => {
  const target = buildUploadTarget({
    originalName: "../lesson one.mp3",
    uniqueId: "fixed-id",
    rootDir: "/repo",
  });

  assert.equal(target.fileName, "fixed-id-lesson-one.mp3");
  assert.equal(target.audioUrl, "/uploads/fixed-id-lesson-one.mp3");
  assert.equal(target.uploadPath, path.join("/repo", "public", "uploads", "fixed-id-lesson-one.mp3"));
});

test("resolveStoredUploadPath accepts only stored uploads inside public/uploads", () => {
  assert.equal(
    resolveStoredUploadPath("/uploads/lesson.mp3", "/repo"),
    path.join("/repo", "public", "uploads", "lesson.mp3")
  );
  assert.equal(
    resolveStoredUploadPath("uploads/lesson.mp3", "/repo"),
    path.join("/repo", "public", "uploads", "lesson.mp3")
  );

  assert.equal(resolveStoredUploadPath("/uploads/../../secret.txt", "/repo"), null);
  assert.equal(resolveStoredUploadPath("https://example.com/audio.mp3", "/repo"), null);
  assert.equal(resolveStoredUploadPath("/other/lesson.mp3", "/repo"), null);
});
