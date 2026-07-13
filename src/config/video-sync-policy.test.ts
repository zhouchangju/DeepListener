import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("remote sync includes derived audio uploads but excludes original videos", () => {
  // The sync scripts live in scripts/ and are invoked from package.json; the
  // policy invariant is that they sync public/uploads/ as a rsync source and
  // never use public/videos/ as a rsync source, and that they never hard-code
  // a deployment target.
  const syncScript = readFileSync(new URL("../../scripts/sync-uploads-and-db.sh", import.meta.url), "utf8");
  const safeSync = readFileSync(new URL("../../scripts/sync-safe.sh", import.meta.url), "utf8");

  // uploads must appear as a rsync source.
  assert.match(syncScript, /rsync[^\n]*public\/uploads\//);
  // videos must NOT appear as a rsync source (comments may mention them).
  assert.doesNotMatch(syncScript, /rsync[^\n]*public\/videos\//);
  // safe-sync must document that videos are excluded.
  assert.match(safeSync, /Original videos in public\/videos are not synced/);

  // No hard-coded deployment host/account/path may live in the sync scripts.
  const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
  assert.doesNotMatch(syncScript, ipPattern);
  assert.doesNotMatch(safeSync, ipPattern);
  assert.match(syncScript, /SYNC_REMOTE/);
  assert.match(safeSync, /SYNC_REMOTE/);
});
