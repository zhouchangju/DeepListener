import assert from "node:assert/strict";
import test from "node:test";
import { validateSubtitleMedia } from "./subtitle-media-validation";

test("subtitle-media validation distinguishes clean, advisory, and blocking duration outcomes", () => {
  const cues = [{ text: "x", start: 0, end: 10 }];
  assert.equal(validateSubtitleMedia(cues, 10).level, "ok");
  assert.equal(validateSubtitleMedia(cues, 9).level, "warning");
  assert.equal(validateSubtitleMedia(cues, 1).level, "block");
  assert.equal(validateSubtitleMedia(cues).reason, "duration-unavailable");
});

test("subtitle-media validation applies a minimum and relative duration tolerance", () => {
  const cues = [{ text: "x", start: 0, end: 11 }];
  assert.equal(validateSubtitleMedia(cues, 10).level, "warning");
  assert.equal(validateSubtitleMedia(cues, 8).level, "block");
  assert.equal(validateSubtitleMedia(cues, 100).level, "ok");
});

test("subtitle-media validation blocks empty, negative, reversed, and materially overlapping cues", () => {
  assert.equal(validateSubtitleMedia([]).reason, "empty");
  assert.equal(validateSubtitleMedia([{ text: "x", start: -1, end: 1 }]).reason, "negative-time");
  assert.equal(validateSubtitleMedia([{ text: "x", start: 2, end: 1 }]).reason, "invalid-range");
  assert.equal(validateSubtitleMedia([
    { text: "a", start: 0, end: 2 },
    { text: "b", start: 1, end: 3 },
  ]).reason, "invalid-range");
});

test("subtitle-media validation keeps valid adjacent cues at the boundary", () => {
  const result = validateSubtitleMedia([
    { text: "a", start: 0, end: 2 },
    { text: "b", start: 2, end: 4 },
  ], 4);
  assert.deepEqual(result, { level: "ok", ok: true, lastCueEnd: 4, toleranceSeconds: 2 });
});
