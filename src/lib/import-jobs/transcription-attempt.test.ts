import assert from "node:assert/strict";
import test from "node:test";
import { beginTranscriptionAttempt, finishTranscriptionAttempt, ownsTranscriptionAttempt } from "./transcription-attempt";
import type { ImportJobManifest } from "./types";

const baseManifest: ImportJobManifest = {
  version: 1,
  id: "123e4567-e89b-42d3-a456-426614174002",
  status: "TRANSCRIBING",
  mediaKind: "AUDIO",
  displayName: "lesson",
  originalName: "lesson.mp3",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
  phase: "transcribing",
  artifacts: [],
};

test("attempt completion is fenced to the current attempt ID", () => {
  const first = beginTranscriptionAttempt("deepgram", "2026-08-04T00:00:01.000Z");
  const second = beginTranscriptionAttempt("openai", "2026-08-04T00:00:02.000Z");
  const current = { ...baseManifest, attempt: second };
  const late = finishTranscriptionAttempt(current, first.id, "SUCCEEDED", "2026-08-04T00:00:03.000Z");
  assert.equal(late.attempt?.id, second.id);
  assert.equal(late.attempt?.status, "RUNNING");
  assert.equal(ownsTranscriptionAttempt(current, second.id), true);
  assert.equal(ownsTranscriptionAttempt(current, first.id), false);
});

test("the current attempt records timeout without exposing provider credentials", () => {
  const attempt = beginTranscriptionAttempt("google", "2026-08-04T00:00:01.000Z");
  const timedOut = finishTranscriptionAttempt(
    { ...baseManifest, attempt },
    attempt.id,
    "TIMED_OUT",
    "2026-08-04T00:01:01.000Z",
  );
  assert.equal(timedOut.attempt?.status, "TIMED_OUT");
  assert.equal(timedOut.attempt?.provider, "google");
  assert.doesNotMatch(JSON.stringify(timedOut), /api[_-]?key|secret|token/i);
});
