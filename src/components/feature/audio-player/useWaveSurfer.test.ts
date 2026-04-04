import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("wave surfer regions plugin listens to the current update event name", () => {
  const source = readFileSync(new URL("./useWaveSurfer.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /regions\.on\("region-update-end"/);
  assert.match(source, /regions\.on\("region-updated",\s*\(region\)\s*=>\s*handleRegionUpdateEnd\(region as Region\)\)/);
});
