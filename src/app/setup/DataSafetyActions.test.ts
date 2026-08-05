import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DataSafetyActions.tsx", import.meta.url), "utf8");

test("data safety actions expose backup, redacted diagnostics, and explicit restore confirmation", () => {
  assert.match(source, /\/api\/backups/);
  assert.match(source, /\/api\/demo/);
  assert.match(source, /\/api\/diagnostics/);
  assert.match(source, /saveDiagnostics/);
  assert.match(source, /hasNativeDiagnosticsExport/);
  assert.match(source, /exportBackup/);
  assert.match(source, /importBackup/);
  assert.match(source, /hasNativeBackupDialogs/);
  assert.match(source, /confirmReplace: true/);
  assert.match(source, /action: "discard"/);
  assert.match(source, /role="status"/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /window\.confirm\(t\("removeDemoConfirm"\)\)/);
  assert.match(source, /demoSeeded/);
  assert.match(source, /removeDemo/);
});

test("data safety actions do not render backup filesystem paths or secret values", () => {
  assert.doesNotMatch(source, /DEEPLISTENER_DATA_DIR|apiKey|DEEPGRAM_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY/);
  assert.doesNotMatch(source, /stagingPath|previousRoot/);
});
