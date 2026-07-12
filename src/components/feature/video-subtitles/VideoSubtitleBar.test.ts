import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./VideoSubtitleBar.tsx", import.meta.url), "utf8");

test("offers an explicit accessible subtitle toggle", () => {
  assert.match(source, /aria-pressed=\{visible\}/);
  assert.match(source, /visible \? "Hide subtitles" : "Show subtitles"/);
});

test("renders a non-interactive two-line high-contrast subtitle surface", () => {
  assert.match(source, /aria-live="off"/);
  assert.match(source, /line-clamp-2/);
  assert.match(source, /bg-black\/80/);
  assert.doesNotMatch(source, /onClick=\{.*subtitle/);
});

