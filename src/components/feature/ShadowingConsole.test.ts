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

test("shadowing text save delegates response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./ShadowingConsole.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*"Failed to save text"\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed to update text"\)/);
});

test("shadowing text save keeps parsed server errors visible in the toast", () => {
  const source = readFileSync(new URL("./ShadowingConsole.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /catch \(error\) \{\s*toast\.error\(error instanceof Error \? error\.message : "Failed to save text"\);/,
  );
});
