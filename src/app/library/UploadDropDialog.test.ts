import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./UploadDropDialog.tsx", import.meta.url), "utf8");

test("upload dialog exposes drag-and-drop and file picker affordances", () => {
  assert.match(source, /DialogContent/);
  assert.match(source, /onDrop=\{handleDrop\}/);
  assert.match(source, /onDragOver=\{handleDragOver\}/);
  assert.match(source, /accept="audio\/\*,video\/mp4,video\/webm"/);
  assert.match(source, /fileInputRef\.current\?\.click\(\)/);
});

test("upload dialog describes generic local media instead of course-specific content", () => {
  assert.match(source, /Drag a media file here/);
  assert.doesNotMatch(source, /Course|Module|Lesson/);
});

test("upload dialog passes dropped or picked files to the caller", () => {
  assert.match(source, /onFilesSelected\(Array\.from\(event\.dataTransfer\.files\)\)/);
  assert.match(source, /onFilesSelected\(Array\.from\(event\.target\.files \|\| \[\]\)\)/);
  assert.match(source, /multiple=\{multiple\}/);
});
