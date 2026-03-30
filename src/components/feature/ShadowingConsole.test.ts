import test from "node:test";
import assert from "node:assert/strict";

import { getShadowingActionButtonsClassName } from "./ShadowingConsole";

test("shadowing text action buttons stay visible without hover", () => {
  assert.equal(
    getShadowingActionButtonsClassName(),
    "absolute -right-16 top-0 flex flex-col gap-1"
  );
});
