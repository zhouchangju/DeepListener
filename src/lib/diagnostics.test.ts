import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  clearStartupFailure,
  collectDiagnostics,
  redactDiagnosticText,
  recordStartupFailure,
  writeDiagnosticsExport,
} from "./diagnostics";
import type { RuntimeLayout } from "./runtime-paths";

function freshRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-diagnostics-test-"));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test("redactDiagnosticText removes secret fields, bearer tokens, and absolute paths", () => {
  const value = redactDiagnosticText(
    "apiKey=private-key authorization=Bearer private-token file=C:\\Users\\Alice\\lesson.mp3 /tmp/private.txt",
    ["private-key", "private-token"],
  );
  assert.doesNotMatch(value, /private-key|private-token|C:\\Users\\Alice|\/tmp\/private\.txt/);
  assert.match(value, /apiKey=<redacted>/i);
  assert.match(value, /authorization=Bearer <redacted>/i);
  assert.match(value, /<private-path>/);
});

test("collectDiagnostics is an allow-list and excludes sensitive/free-form log lines", async () => {
  const fixture = freshRoot();
  try {
    const layout: RuntimeLayout = { root: fixture.root, mode: "desktop" };
    mkdirSync(path.join(fixture.root, "logs"), { recursive: true });
    writeFileSync(
      path.join(fixture.root, "logs", "startup.log"),
      "[desktop] Database ready\n[service] transcript=do not export\n[renderer] learner sentence\n",
      "utf8",
    );
    await recordStartupFailure({ root: fixture.root, code: "LOCAL_SERVICE_UNAVAILABLE", phase: "health", occurredAt: new Date("2026-01-01T00:00:00.000Z") });
    const snapshot = await collectDiagnostics({
      layout,
      provider: {
        provider: "deepgram",
        configured: { deepgram: true, openai: false, google: false },
        hasBaseUrl: false,
      },
      secretValues: { DEEPGRAM_API_KEY: "private-key" },
      now: new Date("2026-01-02T00:00:00.000Z"),
    });
    assert.equal(snapshot.runtime.paths.dataRoot, "<private-data-root>");
    assert.equal(snapshot.provider.connectivity, "not-tested");
    assert.deepEqual(snapshot.startup.previousFailure, {
      code: "LOCAL_SERVICE_UNAVAILABLE",
      phase: "health",
      occurredAt: "2026-01-01T00:00:00.000Z",
    });
    assert.deepEqual(snapshot.logs.includedLines, ["[desktop] Database ready"]);
    assert.doesNotMatch(JSON.stringify(snapshot), /do not export|learner sentence|private-key/);
  } finally {
    fixture.dispose();
  }
});

test("startup failure summary and diagnostics export use atomic, redacted files", async () => {
  const fixture = freshRoot();
  try {
    await recordStartupFailure({ root: fixture.root, code: "DATABASE_UNAVAILABLE", phase: "migration" });
    assert.ok(readFileSync(path.join(fixture.root, "runtime", "startup-failure.json"), "utf8").includes("DATABASE_UNAVAILABLE"));
    const destination = path.join(fixture.root, "exports", "diagnostics.json");
    const result = await writeDiagnosticsExport({
      destination,
      layout: { root: fixture.root, mode: "desktop" },
      provider: {
        provider: "openai",
        configured: { deepgram: false, openai: true, google: false },
        hasBaseUrl: true,
      },
      secretValues: { OPENAI_API_KEY: "private-openai-key" },
    });
    assert.equal(result.ok, true);
    assert.ok(readFileSync(destination, "utf8").includes('"schemaVersion": 1'));
    await clearStartupFailure(fixture.root);
    const snapshot = await collectDiagnostics({ layout: { root: fixture.root, mode: "desktop" } });
    assert.equal(snapshot.startup.previousFailure, undefined);
  } finally {
    fixture.dispose();
  }
});
