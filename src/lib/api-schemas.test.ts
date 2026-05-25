import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewGradeSchema,
  sentencePatchSchema,
  studyTimeSchema,
  trackPatchSchema,
  vaultCreateSchema,
  vaultPatchSchema,
} from "./api-schemas";

test("reviewGradeSchema accepts only supported review qualities", () => {
  assert.equal(reviewGradeSchema.safeParse({ reviewItemId: "item-1", quality: "again" }).success, true);
  assert.equal(reviewGradeSchema.safeParse({ reviewItemId: "item-1", quality: "hard" }).success, true);
  assert.equal(reviewGradeSchema.safeParse({ reviewItemId: "item-1", quality: "good" }).success, true);
  assert.equal(reviewGradeSchema.safeParse({ reviewItemId: "item-1", quality: "easy" }).success, true);
  assert.equal(reviewGradeSchema.safeParse({ reviewItemId: "item-1", quality: "unknown" }).success, false);
});

test("vaultCreateSchema requires sentence id and tag array", () => {
  const parsed = vaultCreateSchema.safeParse({
    sentenceId: "sentence-1",
    tags: ["Grammar", "Vocab"],
    note: "<b>note</b>",
    difficulty: "HARD",
  });

  assert.equal(parsed.success, true);
  assert.equal(vaultCreateSchema.safeParse({ sentenceId: "", tags: [] }).success, false);
  assert.equal(vaultCreateSchema.safeParse({ sentenceId: "sentence-1", tags: "Vocab" }).success, false);
});

test("vaultPatchSchema rejects malformed optional fields", () => {
  assert.equal(vaultPatchSchema.safeParse({ userNote: "<b>note</b>" }).success, true);
  assert.equal(vaultPatchSchema.safeParse({ tags: ["Vocab"], difficulty: "VERY_HARD" }).success, true);
  assert.equal(vaultPatchSchema.safeParse({ tags: "Vocab" }).success, false);
  assert.equal(vaultPatchSchema.safeParse({ difficulty: "IMPOSSIBLE" }).success, false);
});

test("trackPatchSchema accepts existing statuses and rejects arbitrary status strings", () => {
  assert.equal(trackPatchSchema.safeParse({ status: "UNLEARNT" }).success, true);
  assert.equal(trackPatchSchema.safeParse({ status: "LEARNT" }).success, true);
  assert.equal(trackPatchSchema.safeParse({ status: "DONE_BUT_NOT_REALLY" }).success, false);
  assert.equal(trackPatchSchema.safeParse({ title: "" }).success, false);
});

test("sentencePatchSchema requires at least one valid patch field", () => {
  assert.equal(sentencePatchSchema.safeParse({ text: "A real sentence.", formatting: null }).success, true);
  assert.equal(sentencePatchSchema.safeParse({ formatting: "{\"stress\":[0]}" }).success, true);
  assert.equal(sentencePatchSchema.safeParse({}).success, false);
  assert.equal(sentencePatchSchema.safeParse({ text: "   " }).success, false);
  assert.equal(sentencePatchSchema.safeParse({ formatting: 42 }).success, false);
});

test("studyTimeSchema accepts known study modes and positive heartbeat durations", () => {
  assert.equal(studyTimeSchema.safeParse({ type: "LISTENING", duration: 10 }).success, true);
  assert.equal(studyTimeSchema.safeParse({ type: "SHADOWING", duration: 10 }).success, true);
  assert.equal(studyTimeSchema.safeParse({ type: "REVIEW", duration: 10 }).success, true);
  assert.equal(studyTimeSchema.safeParse({ type: "UNKNOWN", duration: 10 }).success, false);
  assert.equal(studyTimeSchema.safeParse({ type: "REVIEW", duration: 0 }).success, false);
  assert.equal(studyTimeSchema.safeParse({ type: "REVIEW", duration: 3601 }).success, false);
});
