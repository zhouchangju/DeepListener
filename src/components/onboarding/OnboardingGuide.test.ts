import assert from "node:assert/strict";
import test from "node:test";

import { getOnboardingProgressLabel } from "./OnboardingGuide";

test("formats accessible progress labels", () => {
  assert.equal(getOnboardingProgressLabel(2, 3), "Step 2 of 3");
});
