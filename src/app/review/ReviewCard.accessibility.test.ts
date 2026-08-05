import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ReviewCard.tsx", import.meta.url), "utf8");

test("review card gives keyboard and screen-reader names to icon actions", () => {
  assert.match(source, /<Button[\s\S]*aria-label=\{t\("shortcutGuideTitle"\)\}/);
  assert.match(source, /aria-label=\{t\("playAudio"\)\}/);
  assert.match(source, /<HelpCircle className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(source, /<Play className="h-8 w-8" aria-hidden="true" \/>/);
});
