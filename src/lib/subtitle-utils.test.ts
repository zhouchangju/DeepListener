import test from "node:test";
import assert from "node:assert/strict";
import { parseSrt, parseSubtitle, parseVtt, validateSubtitleMatch } from "./subtitle-utils";

test("parseSrt converts subtitle cues into non-overlapping sentence timestamps", () => {
  assert.deepEqual(
    parseSrt(`1\n00:00:01,250 --> 00:00:03,500\nWelcome to the lesson.\n\n2\n00:00:03,400 --> 00:00:05,000\nLet's begin.\n`),
    [
      { text: "Welcome to the lesson.", start: 1.25, end: 3.35 },
      { text: "Let's begin.", start: 3.4, end: 5 },
    ],
  );
});

test("parseVtt accepts cue settings and strips markup safely", () => {
  const segments = parseVtt(`WEBVTT\n\n00:00.000 --> 00:02.500 align:start\n<b>Hello</b> &amp; welcome\n\n00:02.400 --> 00:04.000\nWorld`);
  assert.deepEqual(segments, [
    { text: "Hello & welcome", start: 0, end: 2.35 },
    { text: "World", start: 2.4, end: 4 },
  ]);
});

test("invalid subtitle documents are rejected with a safe reason", () => {
  assert.throws(() => parseSubtitle("not a subtitle", "vtt"), /no usable timed cues/i);
  assert.equal(validateSubtitleMatch([{ text: "x", start: 0, end: 5 }], 0.1).ok, false);
});


test("parseSrt removes simple markup and ignores malformed cues", () => {
  assert.deepEqual(parseSrt(`1\nBAD --> TIME\nBroken\n\n2\n00:00:06.000 --> 00:00:08.000\n<i>Technical</i> English\ncontinues here.`), [
    { text: "Technical English continues here.", start: 6, end: 8 },
  ]);
});
