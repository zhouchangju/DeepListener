import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("vault playback controls expose localized names", () => {
  const item = readFileSync(new URL("./VaultListItem.tsx", import.meta.url), "utf8");
  const bar = readFileSync(new URL("./VaultPlayAllBar.tsx", import.meta.url), "utf8");
  const batch = readFileSync(new URL("../library/BatchAudioPlayer.tsx", import.meta.url), "utf8");

  assert.match(item, /aria-label=\{isPlaying \? t\("pauseSentence"\) : t\("playSentence"\)\}/);
  assert.match(bar, /aria-label=\{t\("playAllResume"\)\}/);
  assert.match(bar, /aria-label=\{t\("playAllPause"\)\}/);
  assert.match(bar, /aria-label=\{t\("playAllNext"\)\}/);
  assert.match(bar, /aria-label=\{t\("playAllStop"\)\}/);
  assert.equal((batch.match(/aria-label=\{t\("(?:prevTrack|playTitle|pauseTitle|nextTrack|stopTitle)"\)\}/g) ?? []).length, 5);
});
