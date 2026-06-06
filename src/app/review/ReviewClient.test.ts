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

test("review client does not use hard page reloads for queue refresh", () => {
  const source = readFileSync(new URL("./ReviewClient.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /window\.location\.reload\(/);
});

test("review client delegates segment audio playback to the review audio hook", () => {
  const source = readFileSync(new URL("./ReviewClient.tsx", import.meta.url), "utf8");

  assert.match(source, /useReviewAudio/);
  assert.doesNotMatch(source, /new Audio\(/);
  assert.doesNotMatch(source, /audioRef/);
  assert.doesNotMatch(source, /currentItemRef/);
});

test("review client delegates the flashcard UI to ReviewCard", () => {
  const source = readFileSync(new URL("./ReviewClient.tsx", import.meta.url), "utf8");

  assert.match(source, /ReviewCard/);
  assert.doesNotMatch(source, /<Card className="min-h-\[300px\]/);
});

test("review client delegates mutation response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./ReviewClient.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*"Failed to update"\)/);
  assert.match(source, /requireOkResponse\(res,\s*'Failed to archive'\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed to update"\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\('Failed to archive'\)/);
});
