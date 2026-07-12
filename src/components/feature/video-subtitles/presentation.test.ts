import assert from "node:assert/strict";
import test from "node:test";
import { getActiveSubtitle } from "./presentation";

const sentences = [
  { text: "First sentence", startTime: 0, endTime: 1 },
  { text: "Second sentence", startTime: 1, endTime: 2 },
  { text: "After the gap", startTime: 3, endTime: 4 },
];

test("returns the sentence active at the playback time", () => {
  assert.equal(getActiveSubtitle(sentences, 0.5), "First sentence");
  assert.equal(getActiveSubtitle(sentences, 1.5), "Second sentence");
});

test("prefers the later sentence at a shared boundary", () => {
  assert.equal(getActiveSubtitle(sentences, 1), "Second sentence");
});

test("returns null during real gaps and outside the timeline", () => {
  assert.equal(getActiveSubtitle(sentences, 2.5), null);
  assert.equal(getActiveSubtitle(sentences, -1), null);
  assert.equal(getActiveSubtitle(sentences, 5), null);
});

test("handles malformed playback times safely", () => {
  assert.equal(getActiveSubtitle(sentences, Number.NaN), null);
  assert.equal(getActiveSubtitle(sentences, Number.POSITIVE_INFINITY), null);
});

