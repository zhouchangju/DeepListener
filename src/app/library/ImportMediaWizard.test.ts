import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ImportMediaWizard.tsx", import.meta.url), "utf8");

test("subtitle wizard exposes media and optional SRT/VTT choices", () => {
  assert.match(source, /accept="audio\/\*,video\/mp4,video\/webm"/);
  assert.match(source, /accept="\.srt,\.vtt/);
  assert.match(source, /\/api\/import-jobs/);
  assert.match(source, /\/subtitle/);
  assert.match(source, /subtitleImportDesc/);
  assert.match(source, /subtitleOptional/);
  assert.match(source, /subtitleChooseHint/);
});

test("subtitle wizard uses the streaming body contract and has no provider-key requirement", () => {
  assert.match(source, /body: media/);
  assert.match(source, /X-DeepListener-File-Name/);
  assert.doesNotMatch(source, /API_KEY|apiKey|OPENAI|DEEPGRAM|GOOGLE/);
});

test("subtitle wizard notifies the recovery surface after an operation is created", () => {
  assert.match(source, /onRecoveryChange\?: \(\) => void/);
  assert.match(source, /onRecoveryChange\?\.\(\)/);
});

test("subtitle wizard accepts an explicit initial-open state", () => {
  assert.match(source, /initialOpen\?: boolean/);
  assert.match(source, /useState\(initialOpen\)/);
  assert.match(source, /if \(initialOpen\) setOpen\(true\)/);
});

test("subtitle wizard exposes a concise live status while processing", () => {
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(source, /t\("processingStatus"\)/);
  assert.match(source, /aria-busy=\{busy\}/);
});

test("subtitle wizard warns before a provider-dependent import when none is configured", () => {
  assert.match(source, /configuredProviders\?: readonly \("deepgram" \| "openai" \| "google"\)\[\]/);
  assert.match(source, /configuredProviders !== undefined && configuredProviders\.length === 0 && !subtitle/);
  assert.match(source, /noProviderSubtitleHint/);
  assert.match(source, /href="\/setup#provider-settings"/);
});

test("subtitle wizard blocks a guaranteed provider-dependent audio import but keeps embedded-video recovery", () => {
  assert.match(source, /const isVideoMedia = Boolean\(/);
  assert.match(source, /const providerBlocked = providerMissing && Boolean\(media\) && !isVideoMedia/);
  assert.match(source, /noProviderAudioHint/);
  assert.match(source, /disabled={!media \|\| busy \|\| providerBlocked}/);
  assert.ok(source.includes('startsWith("video/")'));
});

test("subtitle wizard validates subtitle content before creating the media operation", () => {
  assert.match(source, /parseSubtitle\(await subtitle\.text\(\), format\)/);
  assert.match(source, /validateSubtitleMatch\(segments\)/);
  assert.match(source, /toast\.error\(t\("subtitleInvalid"\)\)/);
  assert.match(source, /const response = await fetch\("\/api\/import-jobs"/);
});
