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

export type TrackStatus = (typeof TRACK_STATUSES)[number];

export const DEFAULT_TRACK_STATUS: TrackStatus = "INTENSIVE";

export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  UNLEARNT: "未学习",
  INTENSIVE: "精听",
  ANALYSIS: "分析",
  SHADOWING: "Shadowing",
  SPEED_SHADOWING: "倍速 Shadowing",
  PARAPHRASE: "Paraphrase",
  LEARNT: "已学习",
};

export const TRACK_STATUS_DISPLAY: Record<
  TrackStatus,
  { label: string; textClass: string; bgClass: string; dotClass: string }
> = {
  UNLEARNT: {
    label: TRACK_STATUS_LABELS.UNLEARNT,
    textClass: "text-slate-600 dark:text-slate-300",
    bgClass: "bg-slate-500/10",
    dotClass: "bg-slate-500",
  },
  INTENSIVE: {
    label: TRACK_STATUS_LABELS.INTENSIVE,
    textClass: "text-primary",
    bgClass: "bg-primary/10",
    dotClass: "bg-primary",
  },
  ANALYSIS: {
    label: TRACK_STATUS_LABELS.ANALYSIS,
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    dotClass: "bg-amber-500",
  },
  SHADOWING: {
    label: TRACK_STATUS_LABELS.SHADOWING,
    textClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    dotClass: "bg-purple-500",
  },
  SPEED_SHADOWING: {
    label: TRACK_STATUS_LABELS.SPEED_SHADOWING,
    textClass: "text-pink-600 dark:text-pink-400",
    bgClass: "bg-pink-500/10",
    dotClass: "bg-pink-500",
  },
  PARAPHRASE: {
    label: TRACK_STATUS_LABELS.PARAPHRASE,
    textClass: "text-cyan-600 dark:text-cyan-400",
    bgClass: "bg-cyan-500/10",
    dotClass: "bg-cyan-500",
  },
  LEARNT: {
    label: TRACK_STATUS_LABELS.LEARNT,
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    dotClass: "bg-emerald-500",
  },
};

export const TRACK_STATUS_OPTIONS = TRACK_STATUSES.map((status) => ({
  value: status,
  ...TRACK_STATUS_DISPLAY[status],
}));

export function isTrackStatus(status: string): status is TrackStatus {
  return TRACK_STATUSES.includes(status as TrackStatus);
}

export function getTrackStatusDisplay(status: string) {
  return isTrackStatus(status)
    ? TRACK_STATUS_DISPLAY[status]
    : TRACK_STATUS_DISPLAY[DEFAULT_TRACK_STATUS];
}

export const STUDY_MODES = ["LISTENING", "SHADOWING", "REVIEW"] as const;
