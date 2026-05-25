import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("vault list uses safe helpers for optional review dates", () => {
  const clientSource = readFileSync(new URL("./VaultListClient.tsx", import.meta.url), "utf8");
  const itemSource = readFileSync(new URL("./VaultListItem.tsx", import.meta.url), "utf8");
  const helperSource = readFileSync(new URL("./vault-items.ts", import.meta.url), "utf8");

  assert.doesNotMatch(clientSource, /new Date\(a\.due \|\| a\.nextReview\)/);
  assert.doesNotMatch(clientSource, /new Date\(item\.due \|\| item\.nextReview\)/);
  assert.match(itemSource, /formatReviewDateLabel\(/);
  assert.match(helperSource, /getReviewDateTimestamp\(/);
  assert.match(helperSource, /Number\.POSITIVE_INFINITY/);
});
