import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/vault/VaultFilters.tsx"), "utf8");

test("vault filters expose keyboard disclosure and labelled search", () => {
  assert.match(source, /<button[\s\S]*type="button"[\s\S]*aria-expanded=\{showFilters\}[\s\S]*aria-controls="vault-filters-panel"/);
  assert.match(source, /<div id="vault-filters-panel"/);
  assert.match(source, /<label id="vault-search-label" htmlFor="vault-search"/);
  assert.match(source, /id="vault-search"[\s\S]*aria-labelledby="vault-search-label"/);
  assert.match(source, /aria-hidden="true"[\s\S]*showFilters \? "▼" : "▶"/);
});
