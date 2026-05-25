import test from "node:test";
import assert from "node:assert/strict";
import {
  audioExportSchema,
  libraryExportSchema,
  reviewLogSchema,
  reviewGradeSchema,
  sentencePatchSchema,
  studyTimeSchema,
  trackPatchSchema,
  vaultCreateSchema,
  vaultExportSchema,
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

test("reviewLogSchema requires a review item id and supported rating", () => {
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "item-1", rating: 3 }).success, true);
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "item-1" }).success, false);
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "", rating: 3 }).success, false);
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "item-1", rating: 9 }).success, false);
});

test("audioExportSchema validates export type and filtered fields", () => {
  assert.equal(audioExportSchema.safeParse({ type: "due" }).success, true);
  assert.equal(audioExportSchema.safeParse({ type: "track", trackId: "track-1" }).success, true);
  assert.equal(audioExportSchema.safeParse({ type: "track" }).success, false);
  assert.equal(audioExportSchema.safeParse({ type: "filtered", difficulties: ["HARD"] }).success, true);
  assert.equal(audioExportSchema.safeParse({ type: "filtered", difficulties: ["NOPE"] }).success, false);
  assert.equal(
    audioExportSchema.safeParse({ type: "filtered", dateFrom: "2026-05-20", dateTo: "2026-05-19" }).success,
    false
  );
});

test("vaultExportSchema and libraryExportSchema reject malformed filters", () => {
  assert.equal(vaultExportSchema.safeParse({ tags: ["Vocab"], trackIds: ["track-1"] }).success, true);
  assert.equal(vaultExportSchema.safeParse({ tags: "Vocab" }).success, false);
  assert.equal(vaultExportSchema.safeParse({ dateFrom: "2026-05-20", dateTo: "2026-05-19" }).success, false);

  assert.equal(libraryExportSchema.safeParse({ trackType: "Lecture", selectedTrackIds: ["track-1"] }).success, true);
  assert.equal(libraryExportSchema.safeParse({ selectedTrackIds: [1] }).success, false);
  assert.equal(libraryExportSchema.safeParse({ dateFrom: "bad-date" }).success, false);
});
