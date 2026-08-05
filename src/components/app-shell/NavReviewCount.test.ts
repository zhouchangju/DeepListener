import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./NavReviewCount.tsx", import.meta.url), "utf8");

test("review badge fetches an optional no-store count and refreshes after invalidation", () => {
  assert.match(source, /fetch\("\/api\/review\/count", \{ cache: "no-store" \}\)/);
  assert.match(source, /REVIEW_COUNT_INVALIDATED_EVENT/);
  assert.match(source, /window\.addEventListener/);
  assert.match(source, /window\.removeEventListener/);
});

test("review badge is silent when the count is unavailable or zero", () => {
  assert.match(source, /count === null \|\| count === 0/);
  assert.match(source, /reviewDueLabel/);
  assert.match(source, /aria-label=\{label\}/);
});
