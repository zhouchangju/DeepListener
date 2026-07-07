import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("wave surfer regions plugin listens to the current update event name", () => {
  const source = readFileSync(new URL("./useWaveSurfer.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /regions\.on\("region-update-end"/);
  assert.match(source, /regions\.on\("region-updated",\s*\(region\)\s*=>\s*handleRegionUpdateEnd\(region as Region\)\)/);
});

test("wave surfer full-track loop mode is applied to the media element", () => {
  const hookSource = readFileSync(new URL("./useWaveSurfer.ts", import.meta.url), "utf8");
  const playerSource = readFileSync(new URL("../AudioPlayer.tsx", import.meta.url), "utf8");

  assert.match(hookSource, /loopMode:\s*boolean/);
  assert.match(hookSource, /const\s+media\s*=\s*wavesurferRef\.current\?\.getMediaElement\(\)/);
  assert.match(hookSource, /media\.loop\s*=\s*loopMode/);
  assert.match(hookSource, /media\.loop\s*=\s*false/);
  assert.match(playerSource, /useWaveSurfer\(\{[\s\S]*loopMode,[\s\S]*playbackRate,/);
});
