import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("single upload button delegates response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*t\("uploadFailed"\)\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Upload failed"\)/);
});

test("single upload button maps safe server errors to localized toast copy", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /ApiError, requireOkResponse/);
  assert.match(source, /getRecoveryErrorMessageKey/);
  assert.match(source, /error\?: \{ code\?: string \}/);
  assert.doesNotMatch(source, /error instanceof Error \? error\.message/);
  assert.doesNotMatch(source, /Check your OpenAI API Key/);
});

test("single upload opens a drop dialog while preserving single-file upload handling", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /UploadDropDialog/);
  assert.match(source, /const handleFiles = async \(files: File\[\]\)/);
  assert.match(source, /const file = files\[0\];/);
  assert.match(source, /processFiles=\{handleFiles\}/);
  assert.doesNotMatch(source, /multiple=\{true\}/);
});

test("single upload presents a generic media workflow", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /triggerLabel=\{t\("importMedia"\)\}/);
  assert.match(source, /title=\{t\("importMediaTitle"\)\}/);
  assert.doesNotMatch(source, /Course|Module|Lesson|course note/i);
});

test("single media import streams the file body instead of building a large multipart buffer", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /body: file/);
  assert.match(source, /"X-DeepListener-File-Name": encodeURIComponent\(file\.name\)/);
  assert.doesNotMatch(source, /formData\.append\("file", file\)/);
});

test("single upload can open the subtitle wizard from a decision-guide deep link", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /interface UploadButtonProps/);
  assert.match(source, /initialWizardOpen\?: boolean/);
  assert.match(source, /<ImportMediaWizard/);
  assert.match(source, /configuredProviders=\{configuredProviders\}/);
});

test("single upload forwards masked configured providers to recovery", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /configuredProviders\?: readonly \("deepgram" \| "openai" \| "google"\)\[\]/);
  assert.match(source, /<ImportRecoveryList refreshToken=\{recoveryVersion\} configuredProviders=\{configuredProviders\}/);
});

test("single upload gives no-provider learners executable subtitle and setup paths", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /configuredProviders !== undefined && configuredProviders\.length === 0/);
  assert.match(source, /t\("noProviderImportHint"\)/);
  assert.match(source, /href="\/library\?import=subtitle"/);
  assert.match(source, /href="\/setup#provider-settings"/);
  assert.match(source, /t\("openSubtitleImport"\)/);
  assert.match(source, /t\("openProviderSetup"\)/);
});

test("single upload blocks provider-dependent audio before sending it", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /noProviderConfigured && validation\.mediaKind === "AUDIO"/);
  assert.match(source, /toast\.error\(t\("noProviderAudioHint"\)\)/);
  assert.match(source, /setUploading\(true\)/);
});
