import test from "node:test";
import assert from "node:assert/strict";

test("filtered export keeps both date bounds and makes dateTo inclusive", async () => {
  const routeModule = await import("./route");

  assert.equal(
    typeof routeModule.buildFilteredReviewItemsWhere,
    "function",
    "route should expose buildFilteredReviewItemsWhere for filtered export queries"
  );

  const where = routeModule.buildFilteredReviewItemsWhere({
    difficulties: ["HARD"],
    trackIds: ["track-1"],
    dateFrom: "2026-03-20",
    dateTo: "2026-03-30",
  });

  assert.deepEqual(where.difficulty, { in: ["HARD"] });
  assert.deepEqual(where.sentence, { trackId: { in: ["track-1"] } });
  assert.ok(where.createdAt?.gte instanceof Date);
  assert.ok(where.createdAt?.lte instanceof Date);
  assert.equal(where.createdAt?.gte?.toISOString(), new Date("2026-03-20").toISOString());
  assert.equal(where.createdAt?.lte?.getHours(), 23);
  assert.equal(where.createdAt?.lte?.getMinutes(), 59);
  assert.equal(where.createdAt?.lte?.getSeconds(), 59);
  assert.equal(where.createdAt?.lte?.getMilliseconds(), 999);
  assert.ok(
    where.createdAt!.gte! < where.createdAt!.lte!,
    "dateFrom should not be overwritten when dateTo is also provided"
  );
});

test("due export query uses due date as the source of truth", async () => {
  const routeModule = await import("./route");

  assert.equal(
    typeof routeModule.buildDueReviewItemsWhere,
    "function",
    "route should expose buildDueReviewItemsWhere for due export queries"
  );

  const now = new Date("2026-05-17T10:30:00.000Z");
  const where = routeModule.buildDueReviewItemsWhere(now);

  assert.deepEqual(where, {
    due: { lte: now },
    isArchived: false,
  });
  assert.equal("nextReview" in where, false);
});
