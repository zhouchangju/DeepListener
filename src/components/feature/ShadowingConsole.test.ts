import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getShadowingActionButtonsClassName } from "./ShadowingConsole";

test("shadowing text action buttons reserve layout space beside the text", () => {
  assert.equal(
    getShadowingActionButtonsClassName(),
    "flex shrink-0 flex-row gap-1"
  );
});

test("shadowing text action buttons use the shared positioning class", () => {
  const source = readFileSync(new URL("./ShadowingConsole.tsx", import.meta.url), "utf8");

  assert.match(source, /className=\{getShadowingActionButtonsClassName\(\)\}/);
});
