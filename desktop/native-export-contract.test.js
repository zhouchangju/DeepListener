const test = require("node:test");
const assert = require("node:assert/strict");
const { MAX_DIAGNOSTICS_BYTES, validateDiagnosticsJson } = require("./native-export.js");

const valid = JSON.stringify({
  schemaVersion: 1,
  generatedAt: "2026-08-04T00:00:00.000Z",
  app: { version: "0.2.0" },
  runtime: { mode: "desktop", explicitDataRoot: true, paths: {} },
  checks: {},
  provider: {},
  startup: {},
  logs: { includedLines: [], truncated: false },
});

test("native export accepts only the versioned diagnostics envelope", () => {
  const result = validateDiagnosticsJson(valid);
  assert.equal(result.ok, true);
  assert.match(result.content, /"schemaVersion": 1/);
  assert.match(result.content, /\n$/);
});

test("native export rejects malformed, unknown, and oversized payloads", () => {
  assert.deepEqual(validateDiagnosticsJson("not-json"), { ok: false, code: "INVALID_PAYLOAD" });
  assert.deepEqual(
    validateDiagnosticsJson(JSON.stringify({ ...JSON.parse(valid), secret: "should-not-write" })),
    { ok: false, code: "INVALID_PAYLOAD" },
  );
  assert.deepEqual(
    validateDiagnosticsJson("x".repeat(MAX_DIAGNOSTICS_BYTES + 1)),
    { ok: false, code: "PAYLOAD_TOO_LARGE" },
  );
});
