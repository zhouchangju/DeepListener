import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("vault page delegates data loading to the paged query helper", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /getVaultPageData\(/);
  assert.doesNotMatch(source, /prisma\.reviewItem\.findMany\(/);
  assert.doesNotMatch(source, /userNote:\s*true/);
});

test("vault list items lazy-load rich notes instead of sanitizing every note during first paint", () => {
  const source = readFileSync(new URL("./VaultListItem.tsx", import.meta.url), "utf8");

  assert.match(source, /loadVaultNote\(/);
  assert.doesNotMatch(source, /sanitizeHtml\(item\.userNote\)/);
});

test("vault route exposes a loading skeleton for slow dynamic navigation", () => {
  const loadingPath = new URL("./loading.tsx", import.meta.url);

  assert.equal(existsSync(loadingPath), true);
  assert.match(readFileSync(loadingPath, "utf8"), /VaultListSkeleton/);
});
