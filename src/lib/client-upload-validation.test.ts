import test from "node:test";
import assert from "node:assert/strict";
import { classifyMediaKind, validateClientUpload } from "./client-upload-validation";

test("accepts a normal audio file", () => {
  const result = validateClientUpload({ name: "podcast.mp3", size: 1024, type: "audio/mpeg" });
  assert.equal(result.ok, true);
  assert.equal(result.mediaKind, "AUDIO");
});

test("accepts a normal video file", () => {
  const result = validateClientUpload({ name: "lecture.mp4", size: 10_000_000, type: "video/mp4" });
  assert.equal(result.ok, true);
  assert.equal(result.mediaKind, "VIDEO");
});

test("rejects empty files", () => {
  const result = validateClientUpload({ name: "empty.mp3", size: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.code, "EMPTY_FILE");
});

test("rejects unsupported types before any network call", () => {
  const result = validateClientUpload({ name: "notes.txt", size: 1024, type: "text/plain" });
  assert.equal(result.ok, false);
  assert.equal(result.code, "UNSUPPORTED_TYPE");
});

test("rejects oversized audio with the audio cap", () => {
  const oversized = 250 * 1024 * 1024 + 1;
  const result = validateClientUpload({ name: "huge.mp3", size: oversized });
  assert.equal(result.ok, false);
  assert.equal(result.code, "AUDIO_TOO_LARGE");
});

test("rejects oversized video with the video cap", () => {
  const oversized = 1024 * 1024 * 1024 + 1;
  const result = validateClientUpload({ name: "huge.mp4", size: oversized });
  assert.equal(result.ok, false);
  assert.equal(result.code, "VIDEO_TOO_LARGE");
});

test("classifies by extension when mime is missing", () => {
  assert.equal(classifyMediaKind({ name: "song.wav" }), "AUDIO");
  assert.equal(classifyMediaKind({ name: "clip.webm" }), "VIDEO");
  assert.equal(classifyMediaKind({ name: "data.bin" }), null);
});
