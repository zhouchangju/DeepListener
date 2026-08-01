export interface NamedValueDatum {
  name: string;
  value: number;
}

export interface ReviewCountDatum {
  date: string;
  count: number;
}

export interface RadarDatum {
  subject: string;
  A: number;
  fullMark: number;
}

export interface RetentionDatum {
  date: string;
  /** Retention percentage, or null on days with zero reviews (no data). */
  retention: number | null;
}

export interface LeechItem {
  id: string;
  sentence: {
    text: string;
  };
}

export interface DashboardData {
  countdownDays: number;
  reached: boolean;
  targetDateLabel: string;
  learntCount: number;
  progressPercent: number;
  totalHours: number;
  c1Progress: number;
  totalTracks: number;
  totalSentences: number;
  stabilityData: NamedValueDatum[];
  retentionData: RetentionDatum[];
  leeches: LeechItem[];
  pastData: ReviewCountDatum[];
  futureData: ReviewCountDatum[];
  overdueData: NamedValueDatum[];
  heatmapData: Record<string, number>;
  radarData: RadarDatum[];
  tagData: NamedValueDatum[];
}
