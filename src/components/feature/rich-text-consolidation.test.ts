import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const EDITOR_FILES = [
  "./NoteEditor.tsx",
  "./ReviewNoteEditor.tsx",
  "./RichTextNoteEditor.tsx",
];

for (const file of EDITOR_FILES) {
  test(`${file} uses the shared rich text toolbar`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.match(source, /RichTextToolbar/);
  });

  test(`${file} delegates document commands to the shared rich text hook`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.doesNotMatch(source, /document\.execCommand/);
  });
}

test("autosaving rich text editors share the autosave hook", () => {
  const noteEditor = readFileSync(new URL("./NoteEditor.tsx", import.meta.url), "utf8");
  const reviewEditor = readFileSync(new URL("./ReviewNoteEditor.tsx", import.meta.url), "utf8");

  assert.match(noteEditor, /useAutosavedRichTextNote/);
  assert.match(reviewEditor, /useAutosavedRichTextNote/);
});

test("autosaved rich text hook forwards save errors to consumers", () => {
  const source = readFileSync(new URL("./rich-text/useAutosavedRichTextNote.ts", import.meta.url), "utf8");

  assert.match(source, /onError\?: \(error: unknown\) => void;/);
  assert.match(source, /catch \(error\) \{\s*onError\?\.\(error\);/);
});

test("autosaved note editors delegate response parsing to the shared helper", () => {
  const noteEditor = readFileSync(new URL("./NoteEditor.tsx", import.meta.url), "utf8");
  const reviewEditor = readFileSync(new URL("./ReviewNoteEditor.tsx", import.meta.url), "utf8");

  for (const source of [noteEditor, reviewEditor]) {
    assert.match(source, /@\/lib\/client-response/);
    assert.match(source, /requireOkResponse\(res,\s*t\("saveNoteFailed"\)\)/);
    assert.match(
      source,
      /onError: \(error\) => toast\.error\(error instanceof Error \? error\.message : t\("saveNoteFailed"\)\)/,
    );
    assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed to save"\)/);
  }
});

test("manual rich text editor uses the shared contentEditable hook", () => {
  const source = readFileSync(new URL("./RichTextNoteEditor.tsx", import.meta.url), "utf8");

  assert.match(source, /useRichTextEditor/);
});
