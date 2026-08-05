import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ProviderConfigDialog.tsx", import.meta.url), "utf8");
const en = JSON.parse(readFileSync(new URL("../../../messages/en.json", import.meta.url), "utf8")) as {
  setup: { providerDialog: { configuredPlaceholder: string } };
};
const zh = JSON.parse(readFileSync(new URL("../../../messages/zh-CN.json", import.meta.url), "utf8")) as {
  setup: { providerDialog: { configuredPlaceholder: string } };
};

test("provider configuration exposes selection state and stable form labels", () => {
  assert.match(source, /aria-pressed=\{provider === p\.id\}/);
  assert.match(source, /aria-labelledby=\"provider-choice-label\"/);
  assert.match(source, /<label htmlFor=\"provider-api-key\"/);
  assert.match(source, /id=\"provider-api-key\"/);
  assert.match(source, /aria-describedby=\"provider-key-hint\"/);
  assert.match(source, /<label htmlFor=\"provider-base-url\"/);
  assert.match(source, /id=\"provider-base-url\"/);
  assert.match(source, /aria-expanded=\{showBaseUrl\}/);
  assert.match(source, /aria-controls=\"provider-base-url-section\"/);
  assert.match(source, /aria-busy=\{testing\}/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /aria-describedby="provider-test-disclosure"/);
  assert.match(source, /id="provider-test-disclosure"/);
  assert.match(source, /testConsent/);
  assert.match(source, /if \(!testFile \|\| !isConfigured \|\| !testConsent \|\| testing\) return;/);
  assert.match(source, /disabled=\{!testFile \|\| !testConsent \|\| testing\}/);
  assert.match(source, /status\.\$\{verificationStatus\[provider\]\}/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-atomic="true"/);
  assert.match(source, /closeLabel=\{commonT\(\"close\"\)\}/);
});

test("provider configuration offers explicit credential removal", () => {
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /removeConfirmOpen/);
  assert.match(source, /removeConfirmDescription/);
});

test("configured-key placeholder does not promise an unsupported blank-save path", () => {
  assert.doesNotMatch(en.setup.providerDialog.configuredPlaceholder, /leave blank to keep/i);
  assert.doesNotMatch(zh.setup.providerDialog.configuredPlaceholder, /留空则保持/);
});
