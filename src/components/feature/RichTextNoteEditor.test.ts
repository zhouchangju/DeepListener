import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("rich text note editor avoids rewriting identical html from parent echoes", () => {
  const source = readFileSync(new URL("./rich-text/useRichTextEditor.ts", import.meta.url), "utf8");

  assert.match(source, /editorRef\.current\.innerHTML !== initialHtml/);
});
