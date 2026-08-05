import assert from "node:assert/strict";
import test from "node:test";

import { getProviderGuidance, PROVIDER_GUIDANCE } from "./provider-guidance";

test("provider guidance covers the configured providers with official HTTPS links", () => {
  assert.deepEqual(PROVIDER_GUIDANCE.map((provider) => provider.id), ["deepgram", "openai", "google"]);
  for (const provider of PROVIDER_GUIDANCE) {
    assert.equal(new URL(provider.consoleUrl).protocol, "https:");
    assert.equal(new URL(provider.pricingUrl).protocol, "https:");
    // The official OpenAI console URL legitimately contains the path
    // `api-keys`; the invariant is that guidance never embeds a credential
    // value, not that an official URL avoids security vocabulary.
    assert.doesNotMatch(JSON.stringify({ id: provider.id, copyKey: provider.copyKey }), /api.?key|secret|token/i);
  }
});

test("unknown provider guidance falls back to the recommended first option", () => {
  assert.equal(getProviderGuidance("not-a-provider" as never).id, "deepgram");
});

test("provider guidance exposes exactly one default starting recommendation", () => {
  assert.deepEqual(
    PROVIDER_GUIDANCE.filter((provider) => provider.recommended).map((provider) => provider.id),
    ["deepgram"],
  );
});
