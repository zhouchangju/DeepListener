import assert from "node:assert/strict";
import test from "node:test";
import { getRecoveryErrorMessageKey } from "./recovery-copy";

test("maps known import failures to learner-facing recovery copy", () => {
  assert.equal(getRecoveryErrorMessageKey("PROVIDER_REQUEST_FAILED"), "recoveryErrorProviderRequestFailed");
  assert.equal(getRecoveryErrorMessageKey("SUBTITLE_MISMATCH"), "recoveryErrorSubtitleMismatch");
  assert.equal(getRecoveryErrorMessageKey("DISK_INSUFFICIENT"), "recoveryErrorDiskSpace");
});

test("unknown or missing import failures use a safe generic message", () => {
  assert.equal(getRecoveryErrorMessageKey("INTERNAL_STACK_DETAIL"), "recoveryErrorGeneric");
  assert.equal(getRecoveryErrorMessageKey(undefined), "recoveryErrorGeneric");
});
