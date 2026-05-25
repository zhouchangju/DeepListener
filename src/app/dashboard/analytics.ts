import { DashboardData, LeechItem, NamedValueDatum, RadarDatum, RetentionDatum, ReviewCountDatum } from "./types";

export interface DashboardTrack {
  status: string;
  trackType: string | null;
}

export interface DashboardTag {
  name: string;
  _count: {
    reviewItems: number;
  };
}

export interface DashboardStudySession {
  date: Date;
  duration: number;
  type: string;
}

export interface DashboardReviewLog {
  createdAt: Date;
  reviewItemId: string;
  rating: number;
}

export interface DashboardReviewItem {
  due: Date;
  stability: number;
  sentence: {
    track: {
      trackType: string | null;
    };
  };
}

interface BuildDashboardDataInput {
  countdownDays: number;
  tracks: DashboardTrack[];
  tags: DashboardTag[];
  totalSentences: number;
  studySessions: DashboardStudySession[];
  reviewLogs: DashboardReviewLog[];
  allReviewItems: DashboardReviewItem[];
  leeches: LeechItem[];
  now?: Date;
}

export interface DailyStudyStats {
  total: number;
  types: Record<string, number>;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function buildDashboardData({
  countdownDays,
  tracks,
  tags,
  totalSentences,
  studySessions,
  reviewLogs,
  allReviewItems,
  leeches,
  now = new Date(),
}: BuildDashboardDataInput): DashboardData {
  const totalDurationSeconds = studySessions.reduce((acc, session) => acc + session.duration, 0);
  const totalHours = totalDurationSeconds / 3600;
  const learntCount = tracks.filter((track) => track.status === "LEARNT").length;

  return {
    countdownDays,
    learntCount,
    progressPercent: Math.min(Math.round((learntCount / 100) * 100), 100),
    totalHours,
    c1Progress: Math.min((totalHours / 400) * 100, 100),
    totalTracks: tracks.length,
    totalSentences,
    stabilityData: buildStabilityData(allReviewItems),
    retentionData: buildRetentionData(reviewLogs, now),
    leeches,
    pastData: buildPastReviewData(reviewLogs, now),
    futureData: buildFutureReviewData(allReviewItems, now),
    overdueData: buildOverdueData(allReviewItems, now),
    heatmapData: buildHeatmapData(studySessions),
    radarData: buildRadarData(allReviewItems),
    tagData: tags.map((tag) => ({ name: tag.name, value: tag._count.reviewItems })),
  };
}

export function buildDailyStats(studySessions: DashboardStudySession[]): Array<[string, DailyStudyStats]> {
  const sessionsByDate: Record<string, DailyStudyStats> = {};

  for (const session of studySessions) {
    const dateKey = toDateKey(session.date);
    sessionsByDate[dateKey] ??= { total: 0, types: {} };
    sessionsByDate[dateKey].total += session.duration;
    sessionsByDate[dateKey].types[session.type] = (sessionsByDate[dateKey].types[session.type] || 0) + session.duration;
  }

  return Object.entries(sessionsByDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
}

function buildStabilityData(items: DashboardReviewItem[]): NamedValueDatum[] {
  const stabilityBins = { "New": 0, "Short-term": 0, "Mid-term": 0, "Long-term": 0, "Mature": 0 };

  for (const item of items) {
    const stability = item.stability;
    if (stability === 0) stabilityBins["New"]++;
    else if (stability < 7) stabilityBins["Short-term"]++;
    else if (stability < 30) stabilityBins["Mid-term"]++;
    else if (stability < 365) stabilityBins["Long-term"]++;
    else stabilityBins["Mature"]++;
  }

  return countsToChartData(stabilityBins);
}

function buildRetentionData(reviewLogs: DashboardReviewLog[], now: Date): RetentionDatum[] {
  const dailyRetention: Record<string, { total: number; success: number }> = {};

  for (const log of reviewLogs) {
    const dateKey = toDateKey(log.createdAt);
    dailyRetention[dateKey] ??= { total: 0, success: 0 };
    dailyRetention[dateKey].total++;
    if (log.rating > 1) dailyRetention[dateKey].success++;
  }

  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (13 - i));
    const key = toDateKey(date);
    const stats = dailyRetention[key] || { total: 0, success: 0 };

    return {
      date: key.slice(5),
      retention: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100,
    };
  });
}

function buildOverdueData(items: DashboardReviewItem[], now: Date): NamedValueDatum[] {
  const todayStart = startOfUtcDay(now);
  const overdueBins = { "Today": 0, "1-3d": 0, "4-7d": 0, "1w+": 0 };

  for (const item of items) {
    const dueDate = new Date(item.due);
    if (dueDate >= todayStart) continue;

    const diffDays = Math.floor((todayStart.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) overdueBins["Today"]++;
    else if (diffDays <= 3) overdueBins["1-3d"]++;
    else if (diffDays <= 7) overdueBins["4-7d"]++;
    else overdueBins["1w+"]++;
  }

  return countsToChartData(overdueBins);
}

function buildHeatmapData(studySessions: DashboardStudySession[]): Record<string, number> {
  const heatmapData: Record<string, number> = {};

  for (const session of studySessions) {
    const key = toDateKey(session.date);
    heatmapData[key] = (heatmapData[key] || 0) + session.duration;
  }

  return heatmapData;
}

function buildRadarData(items: DashboardReviewItem[]): RadarDatum[] {
  const masteryByType: Record<string, { stability: number; count: number }> = {};

  for (const item of items) {
    const type = item.sentence.track.trackType || "Other";
    masteryByType[type] ??= { stability: 0, count: 0 };
    masteryByType[type].stability += item.stability;
    masteryByType[type].count++;
  }

  return Object.entries(masteryByType).map(([type, stats]) => ({
    subject: type,
    A: Math.min(Math.round((stats.stability / stats.count / 30) * 100), 100),
    fullMark: 100,
  }));
}

function buildPastReviewData(reviewLogs: DashboardReviewLog[], now: Date): ReviewCountDatum[] {
  const pastReviewsByDateSet: Record<string, Set<string>> = {};

  for (const log of reviewLogs) {
    const dateKey = toDateKey(log.createdAt);
    pastReviewsByDateSet[dateKey] ??= new Set();
    pastReviewsByDateSet[dateKey].add(log.reviewItemId);
  }

  const pastReviewsByDate: Record<string, number> = {};
  for (const [date, itemSet] of Object.entries(pastReviewsByDateSet)) {
    pastReviewsByDate[date] = itemSet.size;
  }

  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (7 - i));
    date.setUTCHours(0, 0, 0, 0);
    return toDateKey(date);
  });

  return past7Days.map((date) => ({ date, count: pastReviewsByDate[date] || 0 }));
}

function buildFutureReviewData(items: DashboardReviewItem[], now: Date): ReviewCountDatum[] {
  const todayStart = startOfUtcDay(now);
  const todayKey = toDateKey(todayStart);
  const futureReviewsByDate: Record<string, number> = {};
  const future7Days = Array.from({ length: 8 }, (_, i) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + i);
    date.setUTCHours(0, 0, 0, 0);
    return toDateKey(date);
  });

  for (const item of items) {
    const dueDate = startOfUtcDay(item.due);
    const dateKey = toDateKey(dueDate);
    if (dueDate < todayStart) futureReviewsByDate[todayKey] = (futureReviewsByDate[todayKey] || 0) + 1;
    else if (future7Days.includes(dateKey)) futureReviewsByDate[dateKey] = (futureReviewsByDate[dateKey] || 0) + 1;
  }

  return future7Days.map((date) => ({ date, count: futureReviewsByDate[date] || 0 }));
}

function countsToChartData(counts: Record<string, number>): NamedValueDatum[] {
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function startOfUtcDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}
