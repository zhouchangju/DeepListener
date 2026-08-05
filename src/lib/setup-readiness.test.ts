import test from "node:test";
import assert from "node:assert/strict";
import { constants } from "node:fs";
import { evaluateSetupReadiness } from "./setup-readiness";

function portablePath(value: string) {
  return value.replaceAll("\\", "/");
}

const accessible = async () => true;
const commandsAvailable = async () => true;

test("reports a fully configured local environment without revealing key values", async () => {
  const secret = "should-never-appear";
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DATABASE_URL: "file:./dev.db",
      TRANSCRIPTION_PROVIDER: "deepgram",
      DEEPGRAM_API_KEY: secret,
    },
    nodeVersion: "22.12.0",
    canAccess: accessible,
    hasCommand: commandsAvailable,
  });

  assert.equal(checks.find((check) => check.id === "provider")?.status, "ready");
  assert.equal(checks.find((check) => check.id === "database")?.status, "ready");
  assert.doesNotMatch(JSON.stringify(checks), new RegExp(secret));
});

test("network exposure is a safety notice on the page, not a readiness check", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DATABASE_URL: "file:./dev.db",
      TRANSCRIPTION_PROVIDER: "deepgram",
      DEEPGRAM_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: accessible,
    hasCommand: commandsAvailable,
  });

  assert.equal(checks.length, 5);
  assert.deepEqual(
    checks.map((check) => check.id),
    ["runtime", "database", "media", "ffmpeg", "provider"],
  );
});

test("gives provider-specific recovery instructions when the selected key is absent", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DATABASE_URL: "file:./dev.db",
      TRANSCRIPTION_PROVIDER: "google",
    },
    nodeVersion: "20.9.0",
    canAccess: accessible,
    hasCommand: commandsAvailable,
  });
  const provider = checks.find((check) => check.id === "provider");

  assert.equal(provider?.status, "action");
  assert.equal(provider?.fixKey, "readiness.provider.missingFix");
  assert.match(String(provider?.values?.keyName ?? ""), /GOOGLE_API_KEY/);
  assert.doesNotMatch(String(provider?.values?.keyName ?? ""), /OPENAI_API_KEY/);
});

test("separates optional media-tool limitations from blocking setup actions", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DATABASE_URL: "file:./dev.db",
      TRANSCRIPTION_PROVIDER: "openai",
      OPENAI_API_KEY: "configured",
    },
    nodeVersion: "18.20.0",
    canAccess: async (target) => !target.endsWith("dev.db"),
    hasCommand: async () => false,
  });

  assert.equal(checks.find((check) => check.id === "runtime")?.status, "action");
  assert.equal(checks.find((check) => check.id === "database")?.status, "action");
  assert.equal(checks.find((check) => check.id === "ffmpeg")?.status, "limited");
});

test("reports an existing media directory that is not writable", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DATABASE_URL: "file:./dev.db",
      TRANSCRIPTION_PROVIDER: "deepgram",
      DEEPGRAM_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: async (target, mode) => {
      if (portablePath(target).endsWith("/uploads")) return mode === constants.F_OK;
      return true;
    },
    hasCommand: commandsAvailable,
  });

  assert.equal(checks.find((check) => check.id === "media")?.status, "action");
});

test("FR-061: a read-only database is never reported Ready", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DATABASE_URL: "file:./dev.db",
      TRANSCRIPTION_PROVIDER: "openai",
      OPENAI_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: async (target, mode) => {
      // dev.db is readable but NOT writable
      if (target.endsWith("dev.db")) return mode === constants.R_OK;
      return true;
    },
    hasCommand: commandsAvailable,
  });
  const database = checks.find((check) => check.id === "database");
  assert.equal(database?.status, "action");
  assert.equal(database?.detailKey, "readiness.database.readonlyDetail");
});

test("explicit Desktop data root resolves database under DEEPLISTENER_DATA_DIR", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DEEPLISTENER_DATA_DIR: "/userdata",
      TRANSCRIPTION_PROVIDER: "openai",
      OPENAI_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: async (target) => {
      // desktop DB lives at /userdata/database/deeplistener.db
      return portablePath(target).includes("/userdata/database/deeplistener.db");
    },
    hasCommand: commandsAvailable,
  });
  const database = checks.find((check) => check.id === "database");
  assert.equal(database?.status, "ready");
  const media = checks.find((check) => check.id === "media");
  assert.equal(media?.status, "action");
});

test("fresh Desktop media paths are ready when their nearest ancestor is writable", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DEEPLISTENER_DATA_DIR: "/userdata",
      TRANSCRIPTION_PROVIDER: "deepgram",
      DEEPGRAM_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: async (target, mode) => {
      const normalized = portablePath(target);
      if (normalized.endsWith("/userdata/database/deeplistener.db")) return true;
      if (normalized.endsWith("/userdata")) return mode === constants.F_OK || mode === constants.W_OK;
      return false;
    },
    hasCommand: commandsAvailable,
  });

  assert.equal(checks.find((check) => check.id === "media")?.status, "ready");
});

test("explicit Desktop root reports actionable database when not initialized", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DEEPLISTENER_DATA_DIR: "/userdata",
      TRANSCRIPTION_PROVIDER: "openai",
      OPENAI_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: async () => false, // nothing exists
    hasCommand: commandsAvailable,
  });
  const database = checks.find((check) => check.id === "database");
  assert.equal(database?.status, "action");
  assert.equal(database?.fixKey, "readiness.database.desktopMissingFix");
});

test("packaged Desktop asset failure never falls back to host FFmpeg commands", async () => {
  let commandProbeCalls = 0;
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DEEPLISTENER_DATA_DIR: "/userdata",
      DEEPLISTENER_RUNTIME_ASSET_STATUS: "missing",
      TRANSCRIPTION_PROVIDER: "deepgram",
      DEEPGRAM_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: async () => true,
    hasCommand: async () => {
      commandProbeCalls += 1;
      return true;
    },
  });

  assert.equal(commandProbeCalls, 0);
  assert.equal(checks.find((check) => check.id === "ffmpeg")?.status, "limited");
});

test("verified packaged Desktop assets make FFmpeg readiness independent of PATH", async () => {
  const checks = await evaluateSetupReadiness({
    cwd: "/workspace",
    env: {
      DEEPLISTENER_DATA_DIR: "/userdata",
      DEEPLISTENER_RUNTIME_ASSET_STATUS: "verified",
      TRANSCRIPTION_PROVIDER: "deepgram",
      DEEPGRAM_API_KEY: "configured",
    },
    nodeVersion: "22.12.0",
    canAccess: async () => true,
    hasCommand: async () => false,
  });

  assert.equal(checks.find((check) => check.id === "ffmpeg")?.status, "ready");
});
