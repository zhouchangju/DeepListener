import test from "node:test";
import assert from "node:assert/strict";
import { toPublicUploadError } from "./upload-error";

test("turns provider credential failures into actionable, provider-neutral guidance", () => {
  const result = toPublicUploadError(new Error("401 invalid API key"));
  assert.equal(result.status, 502);
  assert.match(result.message, /selected transcription provider/i);
  assert.doesNotMatch(result.message, /OpenAI/);
});

test("distinguishes missing media tools and network failures", () => {
  assert.equal(toPublicUploadError(new Error("spawn ffmpeg ENOENT")).status, 503);
  assert.match(toPublicUploadError(new Error("fetch failed: ECONNRESET")).message, /network/i);
});

test("does not expose arbitrary internal error details", () => {
  const result = toPublicUploadError(new Error("SQLITE_CORRUPT private detail"));
  assert.equal(result.status, 500);
  assert.doesNotMatch(result.message, /SQLITE_CORRUPT/);
});
