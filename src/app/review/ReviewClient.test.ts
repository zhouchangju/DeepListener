import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("review client item type keeps track title for vault editing", () => {
  const source = readFileSync(new URL("./ReviewClient.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /track:\s*\{[\s\S]*audioUrl:\s*string;[\s\S]*title:\s*string;[\s\S]*\};/
  );
});

test("review client saved-edit payload keeps tag names as strings", () => {
  const source = readFileSync(new URL("./ReviewClient.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /type EditSavedItem = Partial<ReviewItem> & \{/);
  assert.match(
    source,
    /type EditSavedItem = \{[\s\S]*userNote\?: string(?: \| null)?;[\s\S]*difficulty\?: string;[\s\S]*tags\?: string\[\];[\s\S]*\};/
  );
});
