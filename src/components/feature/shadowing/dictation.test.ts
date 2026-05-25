import test from "node:test";
import assert from "node:assert/strict";

import {
  compareDictationAnswer,
  normalizeDictationText,
} from "./dictation";

test("normalization ignores case punctuation and extra whitespace", () => {
  assert.deepEqual(
    normalizeDictationText("  Hello,   WORLD! "),
    ["hello", "world"]
  );
});

test("matching words pass even when formatting differs", () => {
  const result = compareDictationAnswer(
    "I don't know, actually.",
    "  i dont know actually "
  );

  assert.equal(result.isExactAfterNormalization, true);
  assert.equal(result.accuracy, 100);
  assert.deepEqual(result.missingWords, []);
  assert.deepEqual(result.extraWords, []);
  assert.deepEqual(
    result.wordDiff.map((item) => item.status),
    ["correct", "correct", "correct", "correct"]
  );
});

test("missing extra and different words are separated", () => {
  const result = compareDictationAnswer(
    "We need to finish this today",
    "we need finish that today now"
  );

  assert.equal(result.isExactAfterNormalization, false);
  assert.deepEqual(result.missingWords, ["to", "this"]);
  assert.deepEqual(result.extraWords, ["that", "now"]);
  assert.equal(result.accuracy, 67);
  assert.deepEqual(result.wordDiff, [
    { status: "correct", expected: "we", actual: "we" },
    { status: "correct", expected: "need", actual: "need" },
    { status: "missing", expected: "to" },
    { status: "correct", expected: "finish", actual: "finish" },
    { status: "different", expected: "this", actual: "that" },
    { status: "correct", expected: "today", actual: "today" },
    { status: "extra", actual: "now" },
  ]);
});

test("empty answer keeps every expected word as missing", () => {
  const result = compareDictationAnswer("Listen carefully", "");

  assert.equal(result.accuracy, 0);
  assert.deepEqual(result.missingWords, ["listen", "carefully"]);
  assert.deepEqual(result.extraWords, []);
});
