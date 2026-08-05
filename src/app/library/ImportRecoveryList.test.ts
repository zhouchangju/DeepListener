import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ImportRecoveryList.tsx", import.meta.url), "utf8");

test("recovery only offers configured providers when the server supplies a masked list", () => {
  assert.match(source, /configuredProviders\?: readonly ProviderId\[\]/);
  assert.match(source, /const providerOptions = configuredProviders \?\? \[\]/);
  assert.match(source, /providerOptions\.map\(\(provider\)/);
});

test("recovery does not advertise provider switches when configuration is unknown", () => {
  assert.doesNotMatch(source, /DEFAULT_PROVIDER_IDS/);
  assert.match(source, /An omitted configuration list is an unknown state/);
});

test("recovery communicates elapsed retry progress without changing the operation contract", () => {
  assert.match(source, /setRetryingId\(job\.id\)/);
  assert.match(source, /setRetryElapsed\(Math\.floor/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /t\("recoveryRetrying", \{ elapsed: retryElapsed \}\)/);
  assert.match(source, /t\("recoveryRetryAnnounced"\)/);
});

test("recovery renders localized safe error copy instead of persisted server text", () => {
  assert.match(source, /getRecoveryErrorMessageKey\(job\.error\.code\)/);
  assert.doesNotMatch(source, /job\.error\.message/);
});
