import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("landing demo sends a known database block to Setup", () => {
  assert.match(source, /ApiError/);
  assert.match(source, /error\.code === "DATABASE_NOT_READY"/);
  assert.match(source, /router\.push\("\/setup"\)/);
  assert.match(source, /demoSetupRequired/);
});

test("landing executes a demo request when reached from the explicit setup CTA", () => {
  assert.match(source, /useSearchParams/);
  assert.match(source, /searchParams\.get\("demo"\) !== "1"/);
  assert.match(source, /autoDemoStarted/);
});

test("landing Demo exposes a concise accessible loading state", () => {
  assert.match(source, /disabled=\{demoLoading\}/);
  assert.match(source, /aria-busy=\{demoLoading\}/);
  assert.match(source, /<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">/);
  assert.match(source, /\{copy\.demoLoading\}/);
});

test("landing labels the Server/self-hosted path for technical operators", () => {
  const translationsSource = readFileSync(new URL("./landing-translations.ts", import.meta.url), "utf8");

  assert.match(translationsSource, /Server \/ self-hosted \(for technical operators\)/);
  assert.match(translationsSource, /服务端 \/ 自托管（面向技术维护者）/);
});
