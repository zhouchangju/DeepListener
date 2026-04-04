import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard overview forwards track and sentence totals", () => {
  const source = readFileSync(new URL("./DashboardTabs.tsx", import.meta.url), "utf8");

  assert.match(source, /<OverviewSection[\s\S]*totalTracks=\{data\.totalTracks\}/);
  assert.match(source, /<OverviewSection[\s\S]*totalSentences=\{data\.totalSentences\}/);
});
