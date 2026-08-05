import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DEFAULT_SETTINGS,
  loadSettingsIntoEnv,
  readSettingsFile,
  settingsPath,
  updateSettings,
  writeSettings,
} from "./settings-store";

function freshRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "deeplistener-settings-test-"));
}

test("missing settings use defaults without creating a file", async () => {
  const root = freshRoot();
  const result = await readSettingsFile({ root });
  assert.equal(result.exists, false);
  assert.equal(result.source, "missing");
  assert.deepEqual(result.settings, DEFAULT_SETTINGS);
  assert.equal(existsSync(settingsPath(root)), false);
});

test("old unversioned settings migrate to the current schema", async () => {
  const root = freshRoot();
  const file = settingsPath(root);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({
      provider: "openai",
      OPENAI_BASE_URL: "https://gateway.example.com/v1",
      demoStatus: "completed",
      updateChannel: "beta",
      unknownField: "discard me",
    }),
    "utf8",
  );

  const result = await readSettingsFile({ root });
  assert.equal(result.source, "migrated");
  assert.equal(result.settings.schemaVersion, 1);
  assert.equal(result.settings.selectedProvider, "openai");
  assert.equal(result.settings.openaiBaseUrl, "https://gateway.example.com/v1");
  assert.equal(result.settings.demo.status, "completed");
  assert.equal(result.settings.updateChannel, "beta");
  assert.equal("unknownField" in result.settings, false);
});

test("corrupt settings recover to defaults without replacing the corrupt file", async () => {
  const root = freshRoot();
  const file = settingsPath(root);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, "{not-json", "utf8");

  const result = await readSettingsFile({ root });
  assert.equal(result.source, "recovered");
  assert.deepEqual(result.settings, DEFAULT_SETTINGS);
  assert.equal(readFileSync(file, "utf8"), "{not-json");
});

test("future schema and invalid values fail closed to safe values", async () => {
  const root = freshRoot();
  mkdirSync(path.dirname(settingsPath(root)), { recursive: true });
  writeFileSync(
    settingsPath(root),
    JSON.stringify({
      schemaVersion: 99,
      selectedProvider: "azure",
      diagnostics: { retentionDays: 999 },
    }),
    "utf8",
  );

  const result = await readSettingsFile({ root });
  assert.equal(result.source, "recovered");
  assert.deepEqual(result.settings, DEFAULT_SETTINGS);
});

test("writes are secret-free, bounded, and atomically promoted", async () => {
  const root = freshRoot();
  const saved = await writeSettings({
    schemaVersion: 1,
    selectedProvider: "google",
    openaiBaseUrl: "not-a-url",
    diagnostics: { retentionDays: 100, logLevel: "debug" },
    apiKey: "must-not-persist",
    credentials: { OPENAI_API_KEY: "also-must-not-persist" },
  }, { root });
  const raw = readFileSync(settingsPath(root), "utf8");

  assert.equal(saved.selectedProvider, "google");
  assert.equal(saved.openaiBaseUrl, "");
  assert.equal(saved.diagnostics.retentionDays, 30);
  assert.equal(raw.includes("must-not-persist"), false);
  assert.equal(raw.includes("OPENAI_API_KEY"), false);
  assert.equal(raw.includes(".tmp-"), false);
});

test("an interrupted promotion preserves the old settings and cleans its temp file", async () => {
  const root = freshRoot();
  await writeSettings({ selectedProvider: "deepgram" }, { root });
  const tempPath = `${settingsPath(root)}.tmp-${process.pid}-123-0`;

  await assert.rejects(
    writeSettings(
      { selectedProvider: "openai" },
      {
        root,
        now: () => 123,
        random: () => 0,
        renameFile: async () => {
          throw new Error("simulated interrupted promotion");
        },
      },
    ),
    /simulated interrupted promotion/,
  );

  const result = await readSettingsFile({ root });
  assert.equal(result.settings.selectedProvider, "deepgram");
  assert.equal(existsSync(tempPath), false);
});

test("nested updates preserve unrelated settings", async () => {
  const root = freshRoot();
  await writeSettings({ selectedProvider: "deepgram", demo: { status: "in-progress" } }, { root });
  const updated = await updateSettings({ diagnostics: { logLevel: "warn" } }, { root });

  assert.equal(updated.selectedProvider, "deepgram");
  assert.equal(updated.demo.status, "in-progress");
  assert.equal(updated.diagnostics.logLevel, "warn");
});

test("settings override legacy provider routing only after a settings file exists", async () => {
  const missingRoot = freshRoot();
  const legacyEnv: Record<string, string | undefined> = {
    TRANSCRIPTION_PROVIDER: "openai",
    OPENAI_BASE_URL: "https://legacy.example/v1",
  };
  process.env.DEEPLISTENER_DATA_DIR = missingRoot;
  try {
    await loadSettingsIntoEnv(legacyEnv);
    assert.equal(legacyEnv.TRANSCRIPTION_PROVIDER, "openai");
    assert.equal(legacyEnv.OPENAI_BASE_URL, "https://legacy.example/v1");

    const configuredRoot = freshRoot();
    process.env.DEEPLISTENER_DATA_DIR = configuredRoot;
    await writeSettings({ selectedProvider: "google" }, { root: configuredRoot });
    await loadSettingsIntoEnv(legacyEnv);
    assert.equal(legacyEnv.TRANSCRIPTION_PROVIDER, "google");
    assert.equal(legacyEnv.OPENAI_BASE_URL, undefined);
  } finally {
    delete process.env.DEEPLISTENER_DATA_DIR;
  }
});

test("corrupt settings do not silently override a working legacy profile", async () => {
  const root = freshRoot();
  mkdirSync(path.dirname(settingsPath(root)), { recursive: true });
  writeFileSync(settingsPath(root), "{broken", "utf8");
  process.env.DEEPLISTENER_DATA_DIR = root;
  const env: Record<string, string | undefined> = {
    TRANSCRIPTION_PROVIDER: "openai",
    OPENAI_BASE_URL: "https://legacy.example/v1",
  };
  try {
    await loadSettingsIntoEnv(env);
    assert.equal(env.TRANSCRIPTION_PROVIDER, "openai");
    assert.equal(env.OPENAI_BASE_URL, "https://legacy.example/v1");
  } finally {
    delete process.env.DEEPLISTENER_DATA_DIR;
  }
});
