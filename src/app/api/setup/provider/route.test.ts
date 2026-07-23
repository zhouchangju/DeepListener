import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { GET, POST } from "./route";

/**
 * Provider config API tests.
 *
 * Uses a disposable data root bound via DEEPLISTENER_DATA_DIR so secrets.json
 * is written under <root>/settings/. No real .env or user credentials are
 * touched. The managed env vars (TRANSCRIPTION_PROVIDER / *_API_KEY /
 * OPENAI_BASE_URL) are restored in `after`.
 */
const MANAGED_KEYS = [
  "TRANSCRIPTION_PROVIDER",
  "DEEPGRAM_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENAI_BASE_URL",
] as const;

const ORIGINAL_ENV = { ...process.env };
let dataRoot: string;

before(() => {
  dataRoot = mkdtempSync(join(tmpdir(), "deeplistener-provider-route-"));
  process.env.DEEPLISTENER_DATA_DIR = dataRoot;
  for (const key of MANAGED_KEYS) delete process.env[key];
});

after(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
  if (dataRoot) rmSync(dataRoot, { recursive: true, force: true });
});

function postJson(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/setup/provider", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("GET returns deepgram default and all-unconfigured when nothing is set", async () => {
  for (const key of MANAGED_KEYS) delete process.env[key];
  const res = await GET();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.provider, "deepgram");
  assert.deepEqual(data.configured, { deepgram: false, openai: false, google: false });
  assert.equal(data.hasBaseUrl, false);
});

test("POST with a deepgram key persists and is reflected by GET", async () => {
  const res = await POST(postJson({ provider: "deepgram", apiKey: "dg-key-123" }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.provider, "deepgram");
  assert.equal(data.configured.deepgram, true);
  assert.equal(data.configured.openai, false);

  // GET now reflects the persisted state via process.env.
  const getRes = await GET();
  const getData = await getRes.json();
  assert.equal(getData.configured.deepgram, true);

  // Key value must never appear in the response body.
  const bodyText = JSON.stringify(data) + JSON.stringify(getData);
  assert.equal(bodyText.includes("dg-key-123"), false);
});

test("POST with openai + baseUrl stores both and clears baseUrl when switching away", async () => {
  // Configure openai with a base url.
  let res = await POST(postJson({ provider: "openai", apiKey: "sk-abc", baseUrl: "https://gw.example.com/v1" }));
  assert.equal(res.status, 200);
  assert.equal(process.env.OPENAI_API_KEY, "sk-abc");
  assert.equal(process.env.OPENAI_BASE_URL, "https://gw.example.com/v1");
  assert.equal(process.env.TRANSCRIPTION_PROVIDER, "openai");

  // GET shows hasBaseUrl true but never the URL value.
  const data = await (await GET()).json();
  assert.equal(data.hasBaseUrl, true);
  assert.equal(JSON.stringify(data).includes("gw.example.com"), false);

  // Switching to deepgram clears OPENAI_BASE_URL (only meaningful for openai).
  res = await POST(postJson({ provider: "deepgram", apiKey: "dg-again" }));
  assert.equal(res.status, 200);
  assert.equal(process.env.TRANSCRIPTION_PROVIDER, "deepgram");
  assert.equal(process.env.OPENAI_BASE_URL || "", "");
});

test("POST rejects unknown provider", async () => {
  const res = await POST(postJson({ provider: "azure", apiKey: "x" }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(typeof data.error, "string");
  assert.ok(data.error.length > 0);
});

test("POST rejects empty apiKey", async () => {
  const res = await POST(postJson({ provider: "deepgram", apiKey: "" }));
  assert.equal(res.status, 400);
});

test("POST rejects malformed baseUrl", async () => {
  const res = await POST(postJson({ provider: "openai", apiKey: "sk-x", baseUrl: "not-a-url" }));
  assert.equal(res.status, 400);
});

test("POST rejects unknown extra fields (strict)", async () => {
  const res = await POST(postJson({ provider: "deepgram", apiKey: "x", evil: true }));
  assert.equal(res.status, 400);
});
