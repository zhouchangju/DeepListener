import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GET } from "./route";

test("diagnostics API returns a downloadable redacted JSON snapshot", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-diagnostics-api-"));
  const previousRoot = process.env.DEEPLISTENER_DATA_DIR;
  const previousKey = process.env.DEEPGRAM_API_KEY;
  try {
    process.env.DEEPLISTENER_DATA_DIR = root;
    process.env.DEEPGRAM_API_KEY = "diagnostics-secret-value";
    mkdirSync(path.join(root, "logs"), { recursive: true });
    writeFileSync(
      path.join(root, "logs", "startup.log"),
      `[instrumentation] ready file=${path.join(root, "private.db")} token=diagnostics-secret-value\n[service] transcript=private words\n`,
      "utf8",
    );
    const response = await GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-disposition") ?? "", /deeplistener-diagnostics\.json/);
    const body = await response.text();
    assert.doesNotMatch(body, /diagnostics-secret-value/);
    assert.doesNotMatch(body, /private words/);
    assert.doesNotMatch(body, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(body, /<private-path>|<redacted>|<private-data-root>/);
    assert.doesNotMatch(body, /DEEPGRAM_API_KEY/);
  } finally {
    if (previousRoot === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = previousRoot;
    if (previousKey === undefined) delete process.env.DEEPGRAM_API_KEY;
    else process.env.DEEPGRAM_API_KEY = previousKey;
    rmSync(root, { recursive: true, force: true });
  }
});
