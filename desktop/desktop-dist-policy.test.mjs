import test from "node:test";
import assert from "node:assert/strict";
import { validateReusedStandalone } from "../scripts/desktop-dist-policy.mjs";

function manifest(releaseChannel, systemFfmpegFallback) {
  return {
    schemaVersion: 1,
    releaseChannel,
    build: { systemFfmpegFallback },
  };
}

test("reused standalone must exactly match the requested release channel", () => {
  assert.deepEqual(validateReusedStandalone({
    alpha: true,
    manifest: manifest("internal-alpha", true),
  }), { ok: true });
  assert.deepEqual(validateReusedStandalone({
    alpha: false,
    manifest: manifest("public", false),
  }), { ok: true });

  assert.equal(validateReusedStandalone({
    alpha: false,
    manifest: manifest("internal-alpha", true),
  }).ok, false);
  assert.equal(validateReusedStandalone({
    alpha: true,
    manifest: manifest("public", false),
  }).ok, false);
});
