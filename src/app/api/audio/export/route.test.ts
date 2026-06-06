import test from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import {
  buildDueReviewItemsWhere,
  buildFilteredReviewItemsWhere,
  getSegmentExportAudioFilters,
} from "./query";

function assertDateTimeFilter(
  value: Prisma.ReviewItemWhereInput["createdAt"],
): asserts value is Prisma.DateTimeFilter<"ReviewItem"> {
  assert.ok(value && typeof value === "object" && !(value instanceof Date));
}

test("filtered export keeps both date bounds and makes dateTo inclusive", () => {
  const where = buildFilteredReviewItemsWhere({
    difficulties: ["HARD"],
    trackIds: ["track-1"],
    dateFrom: "2026-03-20",
    dateTo: "2026-03-30",
  });

  assert.deepEqual(where.difficulty, { in: ["HARD"] });
  assert.deepEqual(where.sentence, { trackId: { in: ["track-1"] } });
  assertDateTimeFilter(where.createdAt);
  assert.ok(where.createdAt.gte instanceof Date);
  assert.ok(where.createdAt.lte instanceof Date);
  assert.equal(where.createdAt.gte.toISOString(), new Date("2026-03-20").toISOString());
  assert.equal(where.createdAt.lte.getHours(), 23);
  assert.equal(where.createdAt.lte.getMinutes(), 59);
  assert.equal(where.createdAt.lte.getSeconds(), 59);
  assert.equal(where.createdAt.lte.getMilliseconds(), 999);
  assert.ok(
    where.createdAt.gte < where.createdAt.lte,
    "dateFrom should not be overwritten when dateTo is also provided"
  );
});

test("due export query uses due date as the source of truth", () => {
  const now = new Date("2026-05-17T10:30:00.000Z");
  const where = buildDueReviewItemsWhere(now);

  assert.deepEqual(where, {
    due: { lte: now },
    isArchived: false,
  });
  assert.equal("nextReview" in where, false);
});

test("segment export applies explicit resampling before mp3 encoding", () => {
  assert.deepEqual(getSegmentExportAudioFilters(), [
    {
      filter: "aresample",
      options: "44100",
    },
  ]);
});
