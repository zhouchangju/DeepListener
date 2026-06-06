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
    textClass: "text-slate-600",
    bgClass: "bg-slate-50",
    dotClass: "bg-slate-600",
  },
  INTENSIVE: {
    label: TRACK_STATUS_LABELS.INTENSIVE,
    textClass: "text-indigo-700",
    bgClass: "bg-indigo-50",
    dotClass: "bg-indigo-700",
  },
  ANALYSIS: {
    label: TRACK_STATUS_LABELS.ANALYSIS,
    textClass: "text-amber-700",
    bgClass: "bg-amber-50",
    dotClass: "bg-amber-700",
  },
  SHADOWING: {
    label: TRACK_STATUS_LABELS.SHADOWING,
    textClass: "text-purple-700",
    bgClass: "bg-purple-50",
    dotClass: "bg-purple-700",
  },
  SPEED_SHADOWING: {
    label: TRACK_STATUS_LABELS.SPEED_SHADOWING,
    textClass: "text-pink-700",
    bgClass: "bg-pink-50",
    dotClass: "bg-pink-700",
  },
  PARAPHRASE: {
    label: TRACK_STATUS_LABELS.PARAPHRASE,
    textClass: "text-cyan-700",
    bgClass: "bg-cyan-50",
    dotClass: "bg-cyan-700",
  },
  LEARNT: {
    label: TRACK_STATUS_LABELS.LEARNT,
    textClass: "text-green-700",
    bgClass: "bg-green-50",
    dotClass: "bg-green-700",
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
