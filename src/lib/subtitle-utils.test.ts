import test from "node:test";
import assert from "node:assert/strict";
import { parseSrt } from "./subtitle-utils";

test("parseSrt converts subtitle cues into non-overlapping sentence timestamps", () => {
  assert.deepEqual(
    parseSrt(`1\n00:00:01,250 --> 00:00:03,500\nWelcome to the lesson.\n\n2\n00:00:03,400 --> 00:00:05,000\nLet's begin.\n`),
    [
      { text: "Welcome to the lesson.", start: 1.25, end: 3.35 },
      { text: "Let's begin.", start: 3.4, end: 5 },
    ],
  );
});

test("parseSrt removes simple markup and ignores malformed cues", () => {
  assert.deepEqual(parseSrt(`1\nBAD --> TIME\nBroken\n\n2\n00:00:06.000 --> 00:00:08.000\n<i>Technical</i> English\ncontinues here.`), [
    { text: "Technical English continues here.", start: 6, end: 8 },
  ]);
});
