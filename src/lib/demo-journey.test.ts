import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceDemoJourney,
  INITIAL_DEMO_JOURNEY_STATE,
  isDemoJourneyComplete,
} from "./demo-journey";

test("demo journey advances through the smallest meaningful listening loop", () => {
  let state = INITIAL_DEMO_JOURNEY_STATE;
  for (const event of ["played", "revealed", "sentenceSelected", "saved", "reviewHandoffSeen"] as const) {
    state = advanceDemoJourney(state, event);
  }

  assert.deepEqual(state, {
    played: true,
    revealed: true,
    sentenceSelected: true,
    saved: true,
    reviewHandoffSeen: true,
  });
  assert.equal(isDemoJourneyComplete(state), true);
});

test("out-of-order demo events do not claim progress that was not observed", () => {
  const state = advanceDemoJourney(INITIAL_DEMO_JOURNEY_STATE, "saved");
  assert.deepEqual(state, INITIAL_DEMO_JOURNEY_STATE);
  assert.equal(isDemoJourneyComplete(state), false);
});
