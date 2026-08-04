import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "scripts", "replace-demo-audio.mjs"),
  "utf8",
);

test("demo replacement requires publishable provenance", () => {
  assert.match(source, /--source, and --license are required/);
  assert.doesNotMatch(source, /Source file:.*AUDIO_SRC/);
});

test("demo replacement validates staged audio before atomic asset renames", () => {
  const probeIndex = source.indexOf('execFileSync("ffprobe"');
  const durationValidationIndex = source.indexOf("validateTimeline(timeline, durationSec)");
  const firstRenameIndex = source.indexOf("renameSync(stagedAudio");

  assert.ok(probeIndex >= 0);
  assert.ok(durationValidationIndex > probeIndex);
  assert.ok(firstRenameIndex > durationValidationIndex);
  assert.match(source, /overlaps or is out of order/);
  assert.match(source, /ends after the audio duration/);
});
