import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("review count is a read-only, uncached projection", () => {
  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /reviewItem\.findMany/);
  assert.match(source, /reviewLog\.findMany/);
  assert.match(source, /getDueReviewItemIds/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.doesNotMatch(source, /\.create\(|\.update\(|\.delete\(/);
});

test("review count does not expose raw database errors", () => {
  assert.match(source, /internalServerError\(\)/);
  assert.doesNotMatch(source, /error\.message/);
});
