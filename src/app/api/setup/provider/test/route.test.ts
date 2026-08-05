import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  POST,
  runProviderConnectivityTest,
  type ProviderConnectivityFactory,
  type ProviderCredentialReader,
} from "./route";

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("provider connectivity test never creates an import manifest or Track", () => {
  assert.doesNotMatch(routeSource, /createImportJob|writeManifest|prisma\.track|track\.create/);
  assert.match(routeSource, /mkdtemp\(path\.join\(tmpdir\(\), "deeplistener-provider-test-"\)\)/);
});

test("provider test rejects requests that do not include explicit provider and sample metadata", async () => {
  const response = await POST(new NextRequest("http://localhost/api/setup/provider/test", {
    method: "POST",
    body: "audio",
  }));
  assert.equal(response.status, 400);
});

test("provider test accepts only audio metadata before touching a provider", async () => {
  const body = new TextEncoder().encode("video");
  const response = await POST(new NextRequest("http://localhost/api/setup/provider/test", {
    method: "POST",
    headers: {
      "x-deeplistener-provider": "deepgram",
      "x-deeplistener-file-name": encodeURIComponent("clip.mp4"),
      "x-deeplistener-file-size": String(body.byteLength),
      "content-type": "video/mp4",
    },
    body,
  }));
  assert.equal(response.status, 400);
});

test("provider test rejects an unsupported provider before writing a sample", async () => {
  const body = new TextEncoder().encode("audio");
  const response = await POST(new NextRequest("http://localhost/api/setup/provider/test", {
    method: "POST",
    headers: {
      "x-deeplistener-provider": "unknown",
      "x-deeplistener-file-name": encodeURIComponent("sample.mp3"),
      "x-deeplistener-file-size": String(body.byteLength),
      "content-type": "audio/mpeg",
    },
    body,
  }));
  assert.equal(response.status, 400);
});

test("provider test calls only the explicitly selected provider and redacts its response", async () => {
  const body = new TextEncoder().encode("short audio sample");
  const calls: string[] = [];
  let sampledPath = "";
  const request = new NextRequest("http://localhost/api/setup/provider/test", {
    method: "POST",
    headers: {
      "x-deeplistener-provider": "openai",
      "x-deeplistener-file-name": encodeURIComponent("sample.mp3"),
      "x-deeplistener-file-size": String(body.byteLength),
      "content-type": "audio/mpeg",
    },
    body,
  });

  const response = await runProviderConnectivityTest(request, (provider) => {
    calls.push(provider);
    return {
      async transcribe(filePath) {
        sampledPath = String(filePath);
        assert.equal(await readFile(sampledPath, "utf8"), "short audio sample");
        return {
          fullText: "private transcript that must not be returned",
          segments: [{ text: "private transcript", start: 0, end: 1 }],
          rawJson: JSON.stringify({ apiKey: "fake-secret", transcript: "private transcript" }),
        };
      },
    };
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["openai"]);
  const payload = await response.json() as { ok: boolean; provider: string; sentenceCount: number };
  assert.deepEqual(payload, { ok: true, provider: "openai", sentenceCount: 1 });
  assert.doesNotMatch(JSON.stringify(payload), /private transcript|fake-secret|api[_-]?key/i);
  assert.ok(sampledPath, "the fake provider should receive the temporary sample path");
  await assert.rejects(access(sampledPath), /ENOENT/);
});

test("provider connectivity scopes the selected credential to a marked production seam", async () => {
  const body = new TextEncoder().encode("short audio sample");
  const configs: Array<{ provider: string; apiKey?: string; baseUrl?: string }> = [];
  const factory = Object.assign(
    ((provider: "deepgram" | "openai" | "google", config?: { apiKey: string; baseUrl?: string }) => {
      configs.push({ provider, ...config });
      return {
        async transcribe() {
          return { fullText: "", segments: [{ text: "ok", start: 0, end: 1 }], rawJson: "{}" };
        },
      };
    }) as ProviderConnectivityFactory,
    { credentialScope: true },
  );
  const request = new NextRequest("http://localhost/api/setup/provider/test", {
    method: "POST",
    headers: {
      "x-deeplistener-provider": "openai",
      "x-deeplistener-file-name": encodeURIComponent("sample.mp3"),
      "x-deeplistener-file-size": String(body.byteLength),
      "content-type": "audio/mpeg",
    },
    body,
  });

  const response = await runProviderConnectivityTest(request, factory, async (provider, operation) => {
    assert.equal(provider, "openai");
    return operation("selected-connectivity-secret");
  }, async (provider, status) => {
    assert.equal(provider, "openai");
    assert.equal(status, "verified");
  });

  assert.equal(response.status, 200);
  assert.deepEqual(configs, [{ provider: "openai", apiKey: "selected-connectivity-secret" }]);
});

test("provider connectivity persists invalid versus unknown outcomes without exposing details", async () => {
  const makeRequest = () => {
    const body = new TextEncoder().encode("short audio sample");
    return new NextRequest("http://localhost/api/setup/provider/test", {
      method: "POST",
      headers: {
        "x-deeplistener-provider": "deepgram",
        "x-deeplistener-file-name": encodeURIComponent("sample.mp3"),
        "x-deeplistener-file-size": String(body.byteLength),
        "content-type": "audio/mpeg",
      },
      body,
    });
  };
  const statuses: string[] = [];
  const makeFactory = (failure: string): ProviderConnectivityFactory => Object.assign(
    (() => ({ transcribe: async () => { throw new Error(failure); } })) as ProviderConnectivityFactory,
    { credentialScope: true },
  );
  const credentialReader: ProviderCredentialReader = async <T>(
    _provider: "deepgram" | "openai" | "google",
    operation: (credential: string) => T | Promise<T>,
  ) => operation("selected-secret");
  const statusWriter = async (_provider: "deepgram" | "openai" | "google", status: "unknown" | "unverified" | "verified" | "invalid") => {
    statuses.push(status);
  };

  const invalid = await runProviderConnectivityTest(
    makeRequest(),
    makeFactory("401 invalid API key"),
    credentialReader,
    statusWriter,
  );
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).code, "PROVIDER_NOT_CONFIGURED");
  assert.equal(statuses.at(-1), "invalid");

  for (const failure of ["proxy connection refused", "429 quota exceeded", "provider connectivity timed out"]) {
    const response = await runProviderConnectivityTest(
      makeRequest(),
      makeFactory(failure),
      credentialReader,
      statusWriter,
    );
    assert.equal(response.status, failure.includes("timed out") ? 504 : 502);
    assert.equal((await response.json()).code, failure.includes("timed out") ? "TRANSCRIPTION_TIMEOUT" : "PROVIDER_REQUEST_FAILED");
    assert.equal(statuses.at(-1), "unknown");
  }
});

test("provider connectivity rejects an empty transcript instead of marking it verified", async () => {
  const body = new TextEncoder().encode("short audio sample");
  const request = new NextRequest("http://localhost/api/setup/provider/test", {
    method: "POST",
    headers: {
      "x-deeplistener-provider": "google",
      "x-deeplistener-file-name": encodeURIComponent("sample.wav"),
      "x-deeplistener-file-size": String(body.byteLength),
      "content-type": "audio/wav",
    },
    body,
  });
  const statuses: string[] = [];
  const factory = Object.assign(
    (() => ({ transcribe: async () => ({ fullText: "", segments: [], rawJson: "{}" }) })) as ProviderConnectivityFactory,
    { credentialScope: true },
  );
  const response = await runProviderConnectivityTest(
    request,
    factory,
    async (_provider, operation) => operation("selected-secret"),
    async (_provider, status) => { statuses.push(status); },
  );
  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, "TRANSCRIPTION_NO_SENTENCES");
  assert.equal(statuses.at(-1), "unknown");
});

test("provider SDK failures do not put raw secrets or private text in diagnostics", async () => {
  const body = new TextEncoder().encode("short audio sample");
  const request = new NextRequest("http://localhost/api/setup/provider/test", {
    method: "POST",
    headers: {
      "x-deeplistener-provider": "google",
      "x-deeplistener-file-name": encodeURIComponent("sample.wav"),
      "x-deeplistener-file-size": String(body.byteLength),
      "content-type": "audio/wav",
    },
    body,
  });
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    const response = await runProviderConnectivityTest(request, () => ({
      async transcribe() {
        throw new Error("provider request failed: api-key=private-secret transcript=private words");
      },
    }));
    assert.equal(response.status, 502);
    const payload = await response.json() as { error: string; code?: string };
    assert.equal(payload.code, "PROVIDER_REQUEST_FAILED");
    assert.doesNotMatch(JSON.stringify(payload), /private-secret|private words/i);
    assert.doesNotMatch(logs.join("\n"), /private-secret|private words|api-key/i);
    assert.match(logs.join("\n"), /PROVIDER_REQUEST_FAILED/);
  } finally {
    console.error = originalError;
  }
});
