import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./UploadDropDialog.tsx", import.meta.url), "utf8");

test("upload dialog exposes drag-and-drop and file picker affordances", () => {
  assert.match(source, /DialogContent/);
  assert.match(source, /onDrop=\{handleDrop\}/);
  assert.match(source, /onDragOver=\{handleDragOver\}/);
  assert.match(source, /accept="audio\/\*"/);
  assert.match(source, /fileInputRef\.current\?\.click\(\)/);
});

test("upload dialog passes dropped or picked files to the caller", () => {
  assert.match(source, /onFilesSelected\(Array\.from\(event\.dataTransfer\.files\)\)/);
  assert.match(source, /onFilesSelected\(Array\.from\(event\.target\.files \|\| \[\]\)\)/);
  assert.match(source, /multiple=\{multiple\}/);
});
