import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getPlayerControlsState } from "./presentation";

test("player controls reflect the WaveSurfer playing state", () => {
  assert.deepEqual(
    getPlayerControlsState({
      isPlaying: true,
      isReady: true,
      duration: 42.5,
    }),
    {
      isPlaying: true,
      duration: 42.5,
    }
  );
});

test("player controls hide duration until audio is ready", () => {
  assert.deepEqual(
    getPlayerControlsState({
      isPlaying: false,
      isReady: false,
      duration: 42.5,
    }),
    {
      isPlaying: false,
      duration: 0,
    }
  );
});

test("audio player uses WaveSurfer playback state for controls", () => {
  const source = readFileSync(new URL("../AudioPlayer.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(
    source,
    /const\s+\[isPlaying,\s*setIsPlaying\]\s*=\s*useState\(false\);/
  );
  assert.match(
    source,
    /const\s+\{\s*wavesurferRef,\s*regionsRef,\s*isPlaying:\s*waveSurferIsPlaying\s*\}\s*=\s*useWaveSurfer\(/
  );
  assert.match(
    source,
    /const\s+playerControlsState\s*=\s*getPlayerControlsState\(\{[\s\S]*isPlaying:\s*waveSurferIsPlaying,[\s\S]*\}\);/
  );
  assert.match(source, /<PlayerControls[\s\S]*isPlaying=\{playerControlsState\.isPlaying\}/);
  assert.doesNotMatch(source, /regionsRef\.current\.clearRegions\(\)/);
  assert.match(source, /regionsRef\.current\?\.clearRegions\(\)/);
});
