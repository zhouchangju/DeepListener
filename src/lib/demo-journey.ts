export type DemoJourneyEvent =
  | "played"
  | "revealed"
  | "sentenceSelected"
  | "saved"
  | "reviewHandoffSeen";

export interface DemoJourneyState {
  played: boolean;
  revealed: boolean;
  sentenceSelected: boolean;
  saved: boolean;
  reviewHandoffSeen: boolean;
}

export const INITIAL_DEMO_JOURNEY_STATE: DemoJourneyState = {
  played: false,
  revealed: false,
  sentenceSelected: false,
  saved: false,
  reviewHandoffSeen: false,
};

/**
 * Advance the presentation-only Demo checklist without touching the
 * database. Events are intentionally monotonic and out-of-order events are
 * ignored until their prerequisite is visible to the learner.
 */
export function advanceDemoJourney(
  state: DemoJourneyState,
  event: DemoJourneyEvent,
): DemoJourneyState {
  switch (event) {
    case "played":
      return { ...state, played: true };
    case "revealed":
      return state.played ? { ...state, revealed: true } : state;
    case "sentenceSelected":
      return state.revealed ? { ...state, sentenceSelected: true } : state;
    case "saved":
      return state.sentenceSelected ? { ...state, saved: true } : state;
    case "reviewHandoffSeen":
      return state.saved ? { ...state, reviewHandoffSeen: true } : state;
  }
}

export function isDemoJourneyComplete(state: DemoJourneyState): boolean {
  return Object.values(state).every(Boolean);
}
