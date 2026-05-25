import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const EDITOR_FILES = ["./NoteEditor.tsx", "./ReviewNoteEditor.tsx", "./RichTextNoteEditor.tsx"];

test("shared rich text hook protects contentEditable caret by avoiding identical innerHTML rewrites", () => {
  const source = readFileSync(new URL("./rich-text/useRichTextEditor.ts", import.meta.url), "utf8");

  assert.match(source, /innerHTML !==/);
});

for (const file of EDITOR_FILES) {
  test(`${file} delegates contentEditable synchronization to the shared hook`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.match(source, /use(?:Autosaved)?RichText(?:Note|Editor)/);
  });
}
