import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("vault list uses safe helpers for optional review dates", () => {
  const source = readFileSync(new URL("./VaultListClient.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /new Date\(a\.due \|\| a\.nextReview\)/);
  assert.doesNotMatch(source, /new Date\(item\.due \|\| item\.nextReview\)/);
  assert.match(source, /getReviewDateTimestamp\(/);
  assert.match(source, /formatReviewDateLabel\(/);
});
