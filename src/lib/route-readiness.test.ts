import assert from "node:assert/strict";
import test from "node:test";
import { basename } from "node:path";

import { getDatabaseRouteReadiness } from "./route-readiness";

const readyEnv = {
  DATABASE_URL: "file:./dev.db",
  TRANSCRIPTION_PROVIDER: "deepgram",
  DEEPGRAM_API_KEY: "configured",
};

test("database-backed routes remain available when the resolved database is writable", async () => {
  const result = await getDatabaseRouteReadiness({
    cwd: "/workspace",
    env: readyEnv,
    canAccess: async () => true,
  });

  assert.deepEqual(result, { ok: true });
});

test("database-backed routes become a Setup recovery state when the database is read-only", async () => {
  const result = await getDatabaseRouteReadiness({
    cwd: "/workspace",
    env: readyEnv,
    canAccess: async (target, mode) => {
      if (basename(target) === "dev.db") return mode === 4; // fs.constants.R_OK
      return true;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.check?.detailKey, "readiness.database.readonlyDetail");
  assert.equal(result.check?.fixKey, "readiness.database.readonlyFix");
});

test("invalid runtime configuration fails closed without exposing the configured path", async () => {
  const result = await getDatabaseRouteReadiness({
    cwd: "/workspace",
    env: { DEEPLISTENER_DATA_DIR: "relative-data-root" },
  });

  assert.equal(result.ok, false);
  assert.equal(result.check?.status, "action");
  assert.doesNotMatch(JSON.stringify(result), /relative-data-root/);
});
