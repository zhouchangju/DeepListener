import test from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTIES,
  REVIEW_QUALITIES,
  STUDY_MODES,
  TRACK_STATUS_DISPLAY,
  TRACK_STATUS_LABELS,
  TRACK_STATUSES,
} from "./domain-constants";

test("domain constants expose the known review and learning states", () => {
  assert.deepEqual(REVIEW_QUALITIES, ["again", "hard", "good", "easy"]);
  assert.deepEqual(DIFFICULTIES, ["NORMAL", "HARD", "VERY_HARD"]);
  assert.deepEqual(STUDY_MODES, ["LISTENING", "SHADOWING", "REVIEW"]);
  assert.deepEqual(TRACK_STATUSES, [
    "UNLEARNT",
    "INTENSIVE",
    "ANALYSIS",
    "SHADOWING",
    "SPEED_SHADOWING",
    "PARAPHRASE",
    "LEARNT",
  ]);
});

test("every track status has a display label", () => {
  for (const status of TRACK_STATUSES) {
    assert.equal(typeof TRACK_STATUS_LABELS[status], "string");
    assert.notEqual(TRACK_STATUS_LABELS[status].trim(), "");
  }
});

test("every track status has display metadata", () => {
  for (const status of TRACK_STATUSES) {
    const display = TRACK_STATUS_DISPLAY[status];

    assert.equal(display.label, TRACK_STATUS_LABELS[status]);
    assert.match(display.textClass, /^text-/);
    assert.match(display.bgClass, /^bg-/);
  }
});
