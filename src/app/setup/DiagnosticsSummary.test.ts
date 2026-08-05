import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DiagnosticsSummary.tsx", import.meta.url), "utf8");

test("diagnostics summary consumes only the redacted diagnostics endpoint", () => {
  assert.match(source, /fetch\("\/api\/diagnostics", \{ cache: "no-store" \}\)/);
  assert.match(source, /aria-labelledby="diagnostics-summary-title"/);
  assert.match(source, /diagnosticsCheck\.\$\{key\}/);
  assert.match(source, /diagnosticsStatus/);
  assert.match(source, /diagnosticsPreviousFailure/);
  assert.doesNotMatch(source, /DEEPLISTENER_DATA_DIR|apiKey|DEEPGRAM_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY/);
  assert.doesNotMatch(source, /absolute|transcript|sentence|mediaName|filePath/);
});

test("diagnostics summary has a bounded refresh and failure state", () => {
  assert.match(source, /setLoading\(true\)/);
  assert.match(source, /setLoading\(false\)/);
  assert.match(source, /setFailed\(true\)/);
  assert.match(source, /diagnosticsUnavailable/);
  assert.match(source, /aria-busy=\{loading\}/);
});
