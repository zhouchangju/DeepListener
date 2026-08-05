import assert from "node:assert/strict";
import test from "node:test";
import { getClientUploadValidationMessageKey } from "./client-upload-validation-copy";

test("maps client upload validation codes to localized keys", () => {
  assert.equal(getClientUploadValidationMessageKey("EMPTY_FILE"), "uploadErrorEmptyFile");
  assert.equal(getClientUploadValidationMessageKey("VIDEO_TOO_LARGE"), "uploadErrorVideoTooLarge");
});

test("unknown upload validation codes use a safe unsupported-file message", () => {
  assert.equal(getClientUploadValidationMessageKey("INTERNAL_DETAIL"), "uploadErrorUnsupportedType");
  assert.equal(getClientUploadValidationMessageKey(), "uploadErrorUnsupportedType");
});
