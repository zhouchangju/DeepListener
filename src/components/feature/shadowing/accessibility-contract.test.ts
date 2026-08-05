import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function sourceOf(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

test("shadowing media and text actions expose localized names", () => {
  const miniWave = sourceOf("../MiniWavePlayer.tsx");
  const consoleSource = sourceOf("../ShadowingConsole.tsx");
  const visualization = sourceOf("./ShadowingVisualization.tsx");
  const dictation = sourceOf("./DictationPanel.tsx");

  assert.match(miniWave, /aria-label=\{isPlaying \? t\("pause"\) : t\("play"\)\}/);
  assert.match(miniWave, /aria-label=\{t\("clearSelection"\)\}/);
  assert.match(consoleSource, /aria-label=\{t\("editText"\)\}/);
  assert.match(consoleSource, /aria-label=\{t\("copyText"\)\}/);
  assert.match(consoleSource, /role="button"[\s\S]*tabIndex=\{0\}[\s\S]*aria-label=\{t\("clickToReveal"\)\}/);
  assert.match(consoleSource, /<Textarea aria-label=\{t\("editText"\)\}/);
  assert.match(visualization, /aria-label=\{t\("loopPlayback"\)\}/);
  assert.match(dictation, /aria-label=\{t\("copyOriginalTitle"\)\}/);
  assert.match(dictation, /aria-label=\{t\("dictationLabel"\)\}/);
});
