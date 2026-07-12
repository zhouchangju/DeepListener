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

test("single upload presents a generic media workflow", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /triggerLabel="Import Media"/);
  assert.match(source, /title="Import local media"/);
  assert.doesNotMatch(source, /Course|Module|Lesson|course note/i);
});

test("single media import streams the file body instead of building a large multipart buffer", () => {
  const source = readFileSync(new URL("./UploadButton.tsx", import.meta.url), "utf8");

  assert.match(source, /body: file/);
  assert.match(source, /"X-DeepListener-File-Name": encodeURIComponent\(file\.name\)/);
  assert.doesNotMatch(source, /formData\.append\("file", file\)/);
});
