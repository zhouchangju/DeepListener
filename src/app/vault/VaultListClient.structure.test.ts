import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("vault list delegates large UI regions to focused child components", () => {
  const source = readFileSync(new URL("./VaultListClient.tsx", import.meta.url), "utf8");

  assert.match(source, /VaultFilters/);
  assert.match(source, /VaultListItem/);
  assert.match(source, /VaultPlayAllBar/);
  assert.match(source, /useVaultPlayback/);
  assert.match(source, /useVaultPlayback\(playbackItems\)/);
  assert.doesNotMatch(source, /useVaultPlayback\(filteredItems\)/);
  assert.doesNotMatch(source, /activeTimer/);
});
