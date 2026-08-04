import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the root route exposes demo, setup, and library first-use paths", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /redirect\(/);
  assert.match(source, /href="\/setup"/);
  assert.match(source, /href="\/library"/);
  assert.match(source, /fetch\("\/api\/demo",\s*\{ method: "POST" \}\)/);
  assert.match(source, /router\.push\(`\/practice\/\$\{data\.trackId\}\?demo=1`\)/);
  // Landing text moved to landing-translations.ts
  const translationsSource = readFileSync(new URL("./landing-translations.ts", import.meta.url), "utf8");
  assert.match(translationsSource, /Your media and database stay local; provider keys remain under your control/);
  assert.match(translationsSource, /demoNote/);
});

test("landing preview and setup CTA preserve contrast against primary backgrounds", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /bg-primary-foreground\/70/);
  assert.match(source, /hover:bg-white\/90/);
  assert.doesNotMatch(source, /hover:bg-primary\/10/);
});

test("setup remains dynamic and describes its read-only boundary", () => {
  const source = readFileSync(new URL("./setup/page.tsx", import.meta.url), "utf8");
  const messages = JSON.parse(readFileSync(new URL("../../messages/en.json", import.meta.url), "utf8"));

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /evaluateSetupReadiness\(\)/);
  // setup page resolves copy via getTranslations; the read-only boundary text
  // lives in the dictionary
  assert.match(source, /getTranslations\("setup"\)/);
  assert.match(messages.setup.subtitle, /read-only/);
  assert.equal(messages.setup.configured, "Configured");
  assert.match(messages.setup.readiness.provider.missingFix, /Configure provider/i);
  assert.match(messages.setup.readiness.provider.readyDetail, /configuration only/i);
  assert.match(messages.setup.providerNote, /credentialed external request/i);
  // the network safety notice is page copy, not a probed readiness check
  assert.match(messages.setup.safetyNotice.body, /Do not expose this server directly to the public internet/i);
});
