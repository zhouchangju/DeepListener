export const REVIEW_QUALITIES = ["again", "hard", "good", "easy"] as const;

export const DIFFICULTIES = ["NORMAL", "HARD", "VERY_HARD"] as const;

export const TRACK_STATUSES = [
  "UNLEARNT",
  "INTENSIVE",
  "ANALYSIS",
  "SHADOWING",
  "SPEED_SHADOWING",
  "PARAPHRASE",
  "LEARNT",
] as const;

export const TRACK_STATUS_LABELS: Record<(typeof TRACK_STATUSES)[number], string> = {
  UNLEARNT: "未学习",
  INTENSIVE: "精听",
  ANALYSIS: "分析",
  SHADOWING: "Shadowing",
  SPEED_SHADOWING: "倍速 Shadowing",
  PARAPHRASE: "Paraphrase",
  LEARNT: "已学习",
};

export const STUDY_MODES = ["LISTENING", "SHADOWING", "REVIEW"] as const;
