import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadSecretsIntoEnv,
  readSecretsFile,
  writeSecrets,
  saveProviderConfig,
  getProviderSummary,
  secretsPath,
  secretBackend,
} from "./secrets-store";

function freshRoot(): string {
  return mkdtempSync(join(tmpdir(), "deeplistener-secrets-test-"));
}

function withRoot<T>(fn: (root: string) => T): T {
  const root = freshRoot();
  const prev = process.env.DEEPLISTENER_DATA_DIR;
  process.env.DEEPLISTENER_DATA_DIR = root;
  try {
    return fn(root);
  } finally {
    if (prev === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = prev;
  }
}

async function withRootAsync<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = freshRoot();
  const prev = process.env.DEEPLISTENER_DATA_DIR;
  process.env.DEEPLISTENER_DATA_DIR = root;
  try {
    return await fn(root);
  } finally {
    if (prev === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
    else process.env.DEEPLISTENER_DATA_DIR = prev;
  }
}

test("secretsPath resolves under settings/ in the data root", () => {
  withRoot((root) => {
    const p = secretsPath();
    assert.equal(p, join(root, "settings", "secrets.json"));
  });
});

test("secret backend is file-backed unless the macOS desktop explicitly opts into Keychain", () => {
  assert.equal(secretBackend({ DEEPLISTENER_SECRET_BACKEND: "keychain" }), process.platform === "darwin" ? "keychain" : "file");
  assert.equal(secretBackend({}), "file");
});

test("Keychain migration removes the legacy plaintext file after secure write", () => {
  const source = readFileSync(new URL("./secrets-store.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /await writeKeychainSecret\(payload\);[\s\S]{0,260}await unlink\(secretsPath\(\)\)/,
  );
});

test("readSecretsFile returns {} when the file is missing (ENOENT)", async () => {
  await withRootAsync(async () => {
    const values = await readSecretsFile();
    assert.deepEqual(values, {});
  });
});

test("readSecretsFile ignores unknown keys and non-string values", async () => {
  await withRootAsync(async (root) => {
    const file = join(root, "settings", "secrets.json");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(root, "settings"), { recursive: true }));
    writeFileSync(
      file,
      JSON.stringify({
        DEEPGRAM_API_KEY: "dg-secret",
        UNKNOWN_KEY: "dropped",
        OPENAI_API_KEY: 12345,
        OPENAI_BASE_URL: "https://gw.example.com/v1",
      }),
      "utf8",
    );
    const values = await readSecretsFile();
    assert.equal(values.DEEPGRAM_API_KEY, "dg-secret");
    assert.equal(values.OPENAI_BASE_URL, "https://gw.example.com/v1");
    assert.equal("UNKNOWN_KEY" in values, false);
    assert.equal("OPENAI_API_KEY" in values, false);
  });
});

test("writeSecrets creates the directory and writes only managed keys", async () => {
  await withRootAsync(async (root) => {
    await writeSecrets({
      TRANSCRIPTION_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-test",
      OPENAI_BASE_URL: "https://gw.example.com/v1",
      // @ts-expect-error — verify unknown keys are dropped
      EXTRA_SHOULD_NOT_PERSIST: "nope",
    });
    const file = join(root, "settings", "secrets.json");
    assert.equal(existsSync(file), true);
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.TRANSCRIPTION_PROVIDER, "openai");
    assert.equal(parsed.OPENAI_API_KEY, "sk-test");
    assert.equal(parsed.OPENAI_BASE_URL, "https://gw.example.com/v1");
    assert.equal("EXTRA_SHOULD_NOT_PERSIST" in parsed, false);
  });
});

test("writeSecrets produces 0600 permissions on the secrets file", async () => {
  await withRootAsync(async (root) => {
    await writeSecrets({ DEEPGRAM_API_KEY: "x" });
    const file = join(root, "settings", "secrets.json");
    const stat = await import("node:fs/promises").then(({ stat }) => stat(file));
    // Mask to permission bits only (platforms may set file-type bits).
    const mode = stat.mode & 0o777;
    assert.equal(mode, 0o600);
  });
});

test("loadSecretsIntoEnv merges non-empty values into env without clobbering", async () => {
  await withRootAsync(async () => {
    await writeSecrets({
      TRANSCRIPTION_PROVIDER: "google",
      GOOGLE_API_KEY: "g-secret",
      OPENAI_API_KEY: "", // empty → must not overwrite
    });
    const env: Record<string, string | undefined> = {
      OPENAI_API_KEY: "pre-existing",
    };
    await loadSecretsIntoEnv(env);
    assert.equal(env.TRANSCRIPTION_PROVIDER, "google");
    assert.equal(env.GOOGLE_API_KEY, "g-secret");
    // Empty value in file must not clobber existing env.
    assert.equal(env.OPENAI_API_KEY, "pre-existing");
  });
});

test("saveProviderConfig updates env and preserves other providers' keys", async () => {
  await withRootAsync(async () => {
    // Seed with a deepgram key.
    await writeSecrets({ DEEPGRAM_API_KEY: "dg-existing", TRANSCRIPTION_PROVIDER: "deepgram" });
    const env: Record<string, string | undefined> = {};
    await loadSecretsIntoEnv(env);

    // Switch to openai via the UI path.
    process.env.DEEPLISTENER_DATA_DIR = process.env.DEEPLISTENER_DATA_DIR; // keep root stable
    // saveProviderConfig writes to process.env directly; snapshot a clean env.
    const savedProvider = process.env.TRANSCRIPTION_PROVIDER;
    const savedOpenai = process.env.OPENAI_API_KEY;
    const savedDeepgram = process.env.DEEPGRAM_API_KEY;
    try {
      await saveProviderConfig({ provider: "openai", apiKey: "sk-new", baseUrl: "https://gw/v1" });
      assert.equal(process.env.TRANSCRIPTION_PROVIDER, "openai");
      assert.equal(process.env.OPENAI_API_KEY, "sk-new");
      assert.equal(process.env.OPENAI_BASE_URL, "https://gw/v1");
      // Deepgram key still present in the persisted file.
      const back = await readSecretsFile();
      assert.equal(back.DEEPGRAM_API_KEY, "dg-existing");
    } finally {
      if (savedProvider === undefined) delete process.env.TRANSCRIPTION_PROVIDER;
      else process.env.TRANSCRIPTION_PROVIDER = savedProvider;
      if (savedOpenai === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = savedOpenai;
      if (savedDeepgram === undefined) delete process.env.DEEPGRAM_API_KEY;
      else process.env.DEEPGRAM_API_KEY = savedDeepgram;
      delete process.env.OPENAI_BASE_URL;
    }
  });
});

test("getProviderSummary never exposes key values", () => {
  const summary = getProviderSummary({
    TRANSCRIPTION_PROVIDER: "deepgram",
    DEEPGRAM_API_KEY: "super-secret-value",
    OPENAI_API_KEY: "",
    GOOGLE_API_KEY: undefined,
    OPENAI_BASE_URL: "https://gw/v1",
  });
  assert.equal(summary.provider, "deepgram");
  assert.deepEqual(summary.configured, {
    deepgram: true,
    openai: false,
    google: false,
  });
  assert.equal(summary.hasBaseUrl, true);
  // Ensure no key material leaked.
  const json = JSON.stringify(summary);
  assert.equal(json.includes("super-secret-value"), false);
});

test("getProviderSummary falls back to deepgram for unknown provider", () => {
  const summary = getProviderSummary({ TRANSCRIPTION_PROVIDER: "azure" });
  assert.equal(summary.provider, "deepgram");
});

test("getProviderSummary falls back to deepgram when provider unset", () => {
  const summary = getProviderSummary({});
  assert.equal(summary.provider, "deepgram");
});
