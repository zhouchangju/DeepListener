import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("rename track modal delegates update response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./RenameTrackModal.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*t\("updateFailed"\)\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed"\)/);
});

test("rename track modal keeps parsed server errors visible in the toast", () => {
  const source = readFileSync(new URL("./RenameTrackModal.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /catch \(error\) \{\s*toast\.error\(error instanceof Error \? error\.message : t\("updateFailed"\)\);/,
  );
});
