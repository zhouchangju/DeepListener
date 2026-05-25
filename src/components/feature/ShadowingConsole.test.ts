import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getShadowingActionButtonsClassName } from "./ShadowingConsole";

test("shadowing text action buttons stay visible in a top-right row", () => {
  assert.equal(
    getShadowingActionButtonsClassName(),
    "absolute right-0 top-0 z-10 flex flex-row gap-1"
  );
});

test("shadowing text action buttons use the shared positioning class", () => {
  const source = readFileSync(new URL("./ShadowingConsole.tsx", import.meta.url), "utf8");

  assert.match(source, /className=\{getShadowingActionButtonsClassName\(\)\}/);
});
