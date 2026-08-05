import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

interface TimelineCue {
  text: string;
  start: number;
  end: number;
}

const root = process.cwd();
const timelinePath = path.join(root, "scripts", "demo-timeline.example.json");

function readExampleTimeline(): TimelineCue[] {
  const parsed: unknown = JSON.parse(readFileSync(timelinePath, "utf8"));
  assert.ok(Array.isArray(parsed), "the example timeline must be an array");
  return parsed as TimelineCue[];
}

test("the Demo replacement example contains ordered, non-overlapping speech cues", () => {
  const timeline = readExampleTimeline();
  assert.ok(timeline.length >= 2);

  let previousEnd = 0;
  for (const [index, cue] of timeline.entries()) {
    assert.equal(typeof cue.text, "string", `cue ${index} text must be a string`);
    assert.ok(cue.text.trim(), `cue ${index} text must not be empty`);
    assert.equal(typeof cue.start, "number", `cue ${index} start must be numeric`);
    assert.equal(typeof cue.end, "number", `cue ${index} end must be numeric`);
    assert.ok(Number.isFinite(cue.start) && Number.isFinite(cue.end), `cue ${index} must be finite`);
    assert.ok(cue.start >= previousEnd, `cue ${index} overlaps or is out of order`);
    assert.ok(cue.end > cue.start, `cue ${index} must have positive duration`);
    previousEnd = cue.end;
  }
});
