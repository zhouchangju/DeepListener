import type { TrackStatus } from "@/lib/domain-constants";

/**
 * Maps TrackStatus enum values to relative keys under the "statuses" namespace.
 * UI components use `useTranslations("statuses")` and resolve through this map.
 */
export const trackStatusMessageKeys = {
  UNLEARNT: "unlearnt",
  INTENSIVE: "intensive",
  ANALYSIS: "analysis",
  SHADOWING: "shadowing",
  SPEED_SHADOWING: "speedShadowing",
  PARAPHRASE: "paraphrase",
  LEARNT: "learnt",
} as const satisfies Record<TrackStatus, string>;

/**
 * Maps difficulty values to relative keys under the "difficulties" namespace.
 */
export const difficultyMessageKeys = {
  NORMAL: "normal",
  HARD: "hard",
  VERY_HARD: "veryHard",
} as const;
