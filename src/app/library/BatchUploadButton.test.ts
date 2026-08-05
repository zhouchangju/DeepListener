import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("batch upload button delegates response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*t\("batchFailed"\)\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Batch upload failed"\)/);
});

test("batch upload button maps safe server errors to localized toast and item copy", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /ApiError, requireOkResponse/);
  assert.match(source, /getRecoveryErrorMessageKey/);
  assert.match(source, /failed: Array<\{ fileName: string; error: string; code\?: string \}>/);
  assert.match(source, /error: message/);
  assert.doesNotMatch(source, /error\.message/);
});

test("batch upload opens a drop dialog while preserving multi-file upload handling", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /UploadDropDialog/);
  assert.match(source, /const handleFiles = async \(files: File\[\]\)/);
  assert.match(source, /processFiles=\{handleFiles\}/);
  assert.match(source, /multiple/);
});

test("batch media import matches progress by the original file name", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /success: Array<\{ id: string; title: string; audioUrl: string; fileName: string \}>/);
  assert.match(source, /p\.fileName === item\.fileName/);
  assert.doesNotMatch(source, /item\.title \+ "\.mp3"/);
});

test("batch progress exposes a text status for assistive technology", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /className=\"sr-only\"[\s\S]*t\("uploadPending"\)/);
  assert.match(source, /t\("uploadUploading"\)/);
  assert.match(source, /t\("uploadSuccess"\)/);
  assert.match(source, /t\("uploadError"\)/);
});

test("batch progress marks all selected files as uploading while the request is active", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /setProgress\(initialProgress\.map\(\(item\) => \(\{ \.\.\.item, status: "uploading" \}\)\)\)/);
});

test("batch upload forwards masked configured providers to recovery", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /interface BatchUploadButtonProps/);
  assert.match(source, /configuredProviders=\{configuredProviders\}/);
});

test("batch upload blocks audio files before sending a no-provider batch", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /noProviderConfigured && files\.some\(\(file\) => classifyMediaKind\(file\) === "AUDIO"\)/);
  assert.match(source, /toast\.error\(t\("noProviderBatchHint"\)\)/);
  assert.match(source, /setUploading\(true\)/);
});

test("batch upload reuses client validation before creating an upload request", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /validateClientUpload/);
  assert.match(source, /getClientUploadValidationMessageKey/);
  assert.match(source, /batchValidationError/);
  assert.match(source, /const invalidFile = files[\s\S]*?find\(\(\{ validation \}\) => !validation\.ok\)/);
  assert.match(source, /if \(invalidFile\)[\s\S]*?toast\.error\(t\("batchValidationError"/);
  assert.match(source, /if \(invalidFile\)[\s\S]*?return;[\s\S]*?setUploading\(true\)/);
});
