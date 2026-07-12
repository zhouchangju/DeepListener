import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(new URL("./AudioPlayer.tsx", import.meta.url), "utf8");
const hook = readFileSync(new URL("./audio-player/useWaveSurfer.ts", import.meta.url), "utf8");

test("video practice renders one shared video media element", () => {
  assert.match(player, /videoUrl\?: string \| null/);
  assert.match(player, /<video/);
  assert.match(player, /ref=\{videoRef\}/);
  assert.match(player, /mediaRef:\s*videoUrl \? videoRef : undefined/);
});

test("video subtitles are optional and synchronized from the shared playback clock", () => {
  assert.match(player, /useState\(false\)/);
  assert.match(player, /getActiveSubtitle\(sentences, time\)/);
  assert.match(player, /<VideoSubtitleBar/);
  assert.match(player, /visible=\{subtitlesVisible\}/);
});

test("WaveSurfer binds to the supplied media element instead of starting a second audible source", () => {
  assert.match(hook, /mediaRef\?: RefObject<HTMLMediaElement \| null>/);
  assert.match(hook, /media:\s*mediaRef\?\.current \?\? undefined/);
  assert.match(hook, /if \(!mediaRef\?\.current\) \{/);
  assert.match(hook, /peaks,/);
});

test("browser playback rejections are handled instead of becoming unhandled promises", () => {
  assert.match(player, /function playMediaSafely/);
  assert.match(player, /playMediaSafely\(wavesurferRef\.current\?\.playPause\(\)\)/);
  assert.match(player, /playMediaSafely\(wavesurferRef\.current\?\.play\(\)\)/);
});
