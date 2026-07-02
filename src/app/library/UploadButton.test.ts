import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("single upload button delegates response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*"Upload failed"\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Upload failed"\)/);
});

test("single upload button keeps parsed server errors visible in the toast", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /catch \(error\) \{\s*toast\.error\(error instanceof Error \? error\.message : "Upload failed\. Check your OpenAI API Key\.", \{ id: toastId \}\);/,
  );
});

test("single upload opens a drop dialog while preserving single-file upload handling", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /UploadDropDialog/);
  assert.match(source, /const handleFiles = async \(files: File\[\]\)/);
  assert.match(source, /const file = files\[0\];/);
  assert.match(source, /processFiles=\{handleFiles\}/);
  assert.doesNotMatch(source, /multiple=\{true\}/);
});
