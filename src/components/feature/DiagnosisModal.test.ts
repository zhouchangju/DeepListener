import test from "node:test";
import assert from "node:assert/strict";

import { getInitialDiagnosisTags } from "./DiagnosisModal";

test("defaults to Vocab for a new diagnosis with no existing tags", () => {
  assert.deepEqual(getInitialDiagnosisTags([], true), ["Vocab"]);
});

test("preserves existing diagnosis tags when editing", () => {
  assert.deepEqual(
    getInitialDiagnosisTags(["Linking", "Grammar"], false),
    ["Linking", "Grammar"]
  );
});

test("does not add Vocab when editing an existing diagnosis with no saved tags", () => {
  assert.deepEqual(getInitialDiagnosisTags([], false), []);
});
