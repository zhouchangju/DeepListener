import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("batch upload button delegates response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*"Batch upload failed\. Check your connection\."\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Batch upload failed"\)/);
});

test("batch upload button keeps parsed server errors visible in toast and item details", () => {
  const source = readFileSync(new URL("./BatchUploadButton.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /catch \(error\) \{\s*const message =\s*error instanceof Error\s*\?\s*error\.message\s*:\s*"Batch upload failed\. Check your connection\.";[\s\S]*toast\.error\(message, \{ id: toastId \}\);/,
  );
  assert.match(source, /error: message/);
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
