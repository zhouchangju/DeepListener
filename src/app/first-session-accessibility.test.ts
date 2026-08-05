import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function sourceOf(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const demoPanel = sourceOf("./practice/[id]/DemoJourneyPanel.tsx");
const practice = sourceOf("./practice/[id]/PracticeClient.tsx");
const setup = sourceOf("./setup/page.tsx");
const decisionGuide = sourceOf("./setup/TranscriptionDecisionGuide.tsx");
const providerDialog = sourceOf("./setup/ProviderConfigDialog.tsx");
const importWizard = sourceOf("./library/ImportMediaWizard.tsx");
const recovery = sourceOf("./library/ImportRecoveryList.tsx");

test("Demo checklist exposes a labelled, live progress region", () => {
  assert.match(demoPanel, /aria-labelledby="demo-journey-title"/);
  assert.match(demoPanel, /aria-live="polite"/);
  assert.match(demoPanel, /<ol[\s\S]*STEP_KEYS\.map/);
  assert.match(demoPanel, /<span className="sr-only">\{done \? t\("done"\)/);
});

test("Practice keeps the first-session controls named and stateful", () => {
  assert.match(practice, /aria-label=\{blindMode \? t\("showTranscription"\) : t\("hideTranscription"\)\}/);
  assert.match(practice, /aria-pressed=\{blindMode\}/);
  assert.match(practice, /role="status" aria-live="polite"/);
  assert.match(practice, /\{t\("captureHandoff"\)\}/);
});

test("Setup keeps technical detail discoverable without blocking learner paths", () => {
  assert.match(setup, /<details[\s\S]*<summary[\s\S]*showDetails/);
  assert.match(setup, /id=\{check\.id === "provider" \? "provider-settings"/);
  assert.match(decisionGuide, /href="\/library\?import=media"/);
  assert.match(decisionGuide, /href="\/library\?import=subtitle"/);
  assert.match(decisionGuide, /href="\/\?demo=1"/);
  assert.match(decisionGuide, /href="\/setup#provider-settings"/);
});

test("Provider setup exposes labelled controls and does not reveal stored keys", () => {
  assert.match(providerDialog, /<DialogTitle>\{t\("title"\)\}<\/DialogTitle>/);
  assert.match(providerDialog, /aria-pressed=\{provider === p\.id\}/);
  assert.match(providerDialog, /<label htmlFor="provider-api-key"/);
  assert.match(providerDialog, /type="password"/);
  assert.match(providerDialog, /configuredPlaceholder/);
  assert.doesNotMatch(providerDialog, /initialSummary\.apiKey/);
});

test("Import and recovery surfaces expose progress, recovery, and setup destinations", () => {
  assert.match(importWizard, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(importWizard, /aria-busy=\{busy\}/);
  assert.match(importWizard, /href="\/setup#provider-settings"/);
  assert.match(recovery, /aria-labelledby="import-recovery-heading"/);
  assert.match(recovery, /<h2 id="import-recovery-heading">/);
  assert.match(recovery, /<div className="space-y-2" aria-live="polite">/);
  assert.match(recovery, /role="status" aria-live="polite"/);
  assert.match(recovery, /recoveryOpenSetup/);
});
