import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardData, buildDailyStats, formatDuration } from "./analytics";

const now = new Date("2026-05-25T12:00:00.000Z");

test("buildDashboardData preserves dashboard aggregation semantics", () => {
  const data = buildDashboardData({
    countdownDays: 30,
    now,
    tracks: [
      { status: "UNLEARNT", trackType: "Lecture" },
      { status: "LEARNT", trackType: "Interview" },
      { status: "LEARNT", trackType: null },
    ],
    tags: [
      { name: "Grammar", _count: { reviewItems: 2 } },
      { name: "Pronunciation", _count: { reviewItems: 1 } },
    ],
    totalSentences: 42,
    studySessions: [
      { date: new Date("2026-05-25T01:00:00.000Z"), duration: 1800, type: "LISTENING" },
      { date: new Date("2026-05-24T01:00:00.000Z"), duration: 900, type: "REVIEW" },
    ],
    reviewLogs: [
      { createdAt: new Date("2026-05-24T08:00:00.000Z"), reviewItemId: "item-1", rating: 1 },
      { createdAt: new Date("2026-05-24T09:00:00.000Z"), reviewItemId: "item-1", rating: 3 },
      { createdAt: new Date("2026-05-18T09:00:00.000Z"), reviewItemId: "item-2", rating: 4 },
    ],
    allReviewItems: [
      reviewItem({ due: "2026-05-25T00:00:00.000Z", stability: 0, trackType: "Lecture" }),
      reviewItem({ due: "2026-05-24T12:00:00.000Z", stability: 6, trackType: "Lecture" }),
      reviewItem({ due: "2026-05-22T00:00:00.000Z", stability: 14, trackType: "Interview" }),
      reviewItem({ due: "2026-05-18T00:00:00.000Z", stability: 100, trackType: "Interview" }),
      reviewItem({ due: "2026-05-01T00:00:00.000Z", stability: 400, trackType: null }),
    ],
    leeches: [{ id: "leech-1", sentence: { text: "hard sentence" } }],
  });

  assert.equal(data.learntCount, 2);
  assert.equal(data.progressPercent, 2);
  assert.equal(data.totalTracks, 3);
  assert.equal(data.totalSentences, 42);
  assert.equal(data.totalHours, 0.75);
  assert.deepEqual(data.stabilityData, [
    { name: "New", value: 1 },
    { name: "Short-term", value: 1 },
    { name: "Mid-term", value: 1 },
    { name: "Long-term", value: 1 },
    { name: "Mature", value: 1 },
  ]);
  assert.deepEqual(data.overdueData, [
    { name: "Today", value: 1 },
    { name: "1-3d", value: 1 },
    { name: "4-7d", value: 1 },
    { name: "1w+", value: 1 },
  ]);
  assert.deepEqual(data.heatmapData, {
    "2026-05-24": 900,
    "2026-05-25": 1800,
  });
  assert.deepEqual(data.retentionData.at(-2), { date: "05-24", retention: 50 });
  assert.deepEqual(data.pastData.at(-1), { date: "2026-05-24", count: 1 });
  assert.deepEqual(data.futureData[0], { date: "2026-05-25", count: 5 });
  assert.deepEqual(data.tagData, [
    { name: "Grammar", value: 2 },
    { name: "Pronunciation", value: 1 },
  ]);
  assert.deepEqual(data.leeches, [{ id: "leech-1", sentence: { text: "hard sentence" } }]);
});

test("buildDailyStats groups sessions by date and keeps the newest seven days", () => {
  const stats = buildDailyStats([
    { date: new Date("2026-05-25T01:00:00.000Z"), duration: 600, type: "LISTENING" },
    { date: new Date("2026-05-25T02:00:00.000Z"), duration: 300, type: "REVIEW" },
    { date: new Date("2026-05-24T01:00:00.000Z"), duration: 120, type: "SHADOWING" },
    { date: new Date("2026-05-23T01:00:00.000Z"), duration: 1, type: "LISTENING" },
    { date: new Date("2026-05-22T01:00:00.000Z"), duration: 1, type: "LISTENING" },
    { date: new Date("2026-05-21T01:00:00.000Z"), duration: 1, type: "LISTENING" },
    { date: new Date("2026-05-20T01:00:00.000Z"), duration: 1, type: "LISTENING" },
    { date: new Date("2026-05-19T01:00:00.000Z"), duration: 1, type: "LISTENING" },
    { date: new Date("2026-05-18T01:00:00.000Z"), duration: 999, type: "LISTENING" },
  ]);

  assert.equal(stats.length, 7);
  assert.deepEqual(stats[0], [
    "2026-05-25",
    { total: 900, types: { LISTENING: 600, REVIEW: 300 } },
  ]);
  assert.equal(stats.at(-1)?.[0], "2026-05-19");
});

test("formatDuration uses compact hour and minute labels", () => {
  assert.equal(formatDuration(59), "0m");
  assert.equal(formatDuration(125), "2m");
  assert.equal(formatDuration(3660), "1h 1m");
});

function reviewItem({ due, stability, trackType }: { due: string; stability: number; trackType: string | null }) {
  return {
    due: new Date(due),
    stability,
    difficulty: "NORMAL",
    lapse: 0,
    sentence: {
      track: { trackType },
    },
  };
}
