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

test("the primary transport control has an accessible play or pause name", () => {
  const source = readFileSync(new URL("./PlayerControls.tsx", import.meta.url), "utf8");
  assert.match(source, /useTranslations\("feature\.audioPlayer"\)/);
  assert.match(source, /aria-label=\{isPlaying \? t\("pause"\) : t\("play"\)\}/);
  assert.match(source, /\{t\("position"\)\}/);
  assert.match(source, /\{t\("loop"\)\}/);
  assert.match(source, /\{t\("clear"\)\}/);
});

test("waveform help text follows the selected locale", () => {
  const source = readFileSync(new URL("./WaveformArea.tsx", import.meta.url), "utf8");
  assert.match(source, /useTranslations\("feature\.audioPlayer"\)/);
  assert.match(source, /\{t\("waveformSelect"\)\}/);
  assert.match(source, /\{t\("waveformPan"\)\}/);
  assert.match(source, /\{t\("waveformZoom"\)\}/);
  assert.match(source, /\{t\("keyboardPlayPause"\)\}/);
});
