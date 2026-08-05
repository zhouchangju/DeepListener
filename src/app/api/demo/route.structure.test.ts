import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("demo management checks database readiness before touching demo records", () => {
  assert.match(source, /evaluateDatabaseReadiness/);
  assert.match(source, /DATABASE_NOT_READY/);
  assert.match(source, /status: 503/);
  assert.match(source, /databaseReadyOrResponse\(\)/);
});

test("demo recovery response does not expose runtime paths or provider details", () => {
  assert.match(source, /Local learning data is not ready\. Open Setup to review the checks\./);
  assert.doesNotMatch(source, /error\.message/);
  assert.doesNotMatch(source, /process\.env/);
});

test("demo management has no transcription/provider request path", () => {
  assert.doesNotMatch(source, /getTranscriptionProvider|TranscriptionProvider|fetch\(/);
  assert.match(source, /seedDemoTrack\(\)/);
  assert.match(source, /removeDemoTracks\(\)/);
});
