import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getOnboardingProgressLabel,
  getSpotlightOverlayRegions,
  type TargetRect,
} from "./OnboardingGuide";

test("formats accessible progress labels", () => {
  assert.equal(getOnboardingProgressLabel(2, 3), "Step 2 of 3");
});

test("spotlight overlay regions leave the highlighted target uncovered", () => {
  const target: TargetRect = {
    top: 100,
    left: 200,
    width: 120,
    height: 40,
    viewportWidth: 1280,
    viewportHeight: 800,
  };
  const regions = getSpotlightOverlayRegions(target);
  const hole = { top: 92, left: 192, right: 328, bottom: 148 };

  for (const region of regions) {
    const right = region.left + region.width;
    const bottom = region.top + region.height;
    const intersectsHole =
      region.left < hole.right && right > hole.left && region.top < hole.bottom && bottom > hole.top;
    assert.equal(intersectsHole, false);
  }
  assert.equal(regions.length, 4);
});

test("the guide closes after the real highlighted target is activated", () => {
  const source = readFileSync(new URL("./OnboardingGuide.tsx", import.meta.url), "utf8");

  assert.match(source, /target\.addEventListener\("click", handleTargetActivate\)/);
  assert.match(source, /closeAfterCompletion\("complete", "action"\)/);
  assert.match(source, /target\.removeEventListener\("click", handleTargetActivate\)/);
});

test("the guide bubble remains scrollable in a short or zoomed viewport", () => {
  const source = readFileSync(new URL("./OnboardingGuide.tsx", import.meta.url), "utf8");

  assert.equal((source.match(/maxHeight: "calc\(100vh - 32px\)"/g) ?? []).length, 2);
  assert.equal((source.match(/overflowY: "auto"/g) ?? []).length, 2);
});
