import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("edit vault modal guards save when no item is selected", () => {
  const source = readFileSync(new URL("./EditVaultModal.tsx", import.meta.url), "utf8");

  assert.match(source, /const handleSave = async \(\) => \{\s*if \(!item\) return;/);
});

test("edit vault modal delegates load and save response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./EditVaultModal.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*"Failed to load note"\)/);
  assert.match(source, /requireOkResponse\(res,\s*"Failed to update"\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed to load note"\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed to update"\)/);
});

test("edit vault modal keeps parsed server errors visible in toasts", () => {
  const source = readFileSync(new URL("./EditVaultModal.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /catch\(\(error\) => \{\s*if \(!cancelled\) toast\.error\(error instanceof Error \? error\.message : "Failed to load note"\);/,
  );
  assert.match(
    source,
    /catch \(error\) \{\s*toast\.error\(error instanceof Error \? error\.message : "Failed to save changes"\);/,
  );
});
