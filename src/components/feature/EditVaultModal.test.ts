import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("edit vault modal guards save when no item is selected", () => {
  const source = readFileSync(new URL("./EditVaultModal.tsx", import.meta.url), "utf8");

  assert.match(source, /const handleSave = async \(\) => \{\s*if \(!item\) return;/);
});
