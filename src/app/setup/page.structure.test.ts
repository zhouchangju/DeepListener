import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const decisionGuideSource = readFileSync(new URL("./TranscriptionDecisionGuide.tsx", import.meta.url), "utf8");

test("setup keeps technical readiness details behind progressive disclosure", () => {
  assert.match(source, /<details[\s\S]*<summary[\s\S]*showDetails/);
  assert.match(source, /status\$\{check\.status\[0\]\.toUpperCase\(\)\}/);
  assert.match(source, /<p>\{t\(check\.detailKey as SetupKey, check\.values\)\}<\/p>/);
  assert.match(source, /check\.fixKey[\s\S]*t\(\"nextPrefix\"/);
});

test("setup summary keeps a real destination when checks need attention", () => {
  assert.match(source, /<Link href=\"#setup-readiness-checks\">/);
  assert.doesNotMatch(source, /<Button disabled>\{t\(\"resolveFirst\"\)\}<\/Button>/);
});

test("opening the setup decision guide does not issue a provider request", () => {
  assert.doesNotMatch(decisionGuideSource, /fetch\(|getTranscriptionProvider|transcribe\(/);
  assert.match(decisionGuideSource, /PROVIDER_GUIDANCE/);
});

test("setup decision guide exposes executable no-key, provider, and demo paths", () => {
  assert.match(decisionGuideSource, /href="\/library\?import=media"/);
  assert.match(decisionGuideSource, /href="\/library\?import=subtitle"/);
  assert.match(decisionGuideSource, /href="\/setup#provider-settings"/);
  assert.match(decisionGuideSource, /href="\/?\?demo=1"/);
  assert.match(source, /id=\{check\.id === "provider" \? "provider-settings"/);
});

test("provider decision action uses a native anchor so the hashchange opens the dialog", () => {
  assert.match(decisionGuideSource, /<a[^>]*href="\/setup#provider-settings"/);
  assert.doesNotMatch(decisionGuideSource, /<Link[^>]*href="\/setup#provider-settings"/);
});

test("provider decision guide exposes one explicit default starting point", () => {
  assert.match(decisionGuideSource, /provider\.recommended/);
  assert.match(decisionGuideSource, /t\("recommended"/);
  assert.match(decisionGuideSource, /t\("recommendedReason"/);
});
