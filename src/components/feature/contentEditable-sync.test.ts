import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const EDITOR_FILES = [
  "./NoteEditor.tsx",
  "./ReviewNoteEditor.tsx",
  "./RichTextNoteEditor.tsx",
];

for (const file of EDITOR_FILES) {
  test(`${file} protects contentEditable caret by avoiding identical innerHTML rewrites`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.match(source, /innerHTML !==/);
  });
}
