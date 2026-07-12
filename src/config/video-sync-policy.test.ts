import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("remote sync includes derived audio uploads but excludes original videos", () => {
  const packageSource = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
  const safeSync = readFileSync(new URL("../../scripts/sync-safe.sh", import.meta.url), "utf8");

  assert.match(packageSource, /public\/uploads\//);
  assert.doesNotMatch(packageSource, /public\/videos\//);
  assert.match(safeSync, /Original videos in public\/videos are not synced/);
});
