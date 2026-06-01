import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_VAULT_PAGE_SIZE,
  MAX_VAULT_PAGE_SIZE,
  buildVaultExportWhere,
  buildVaultFindManyArgs,
  buildVaultPlaybackFindManyArgs,
  buildVaultWhere,
  parseVaultSearchParams,
} from "./vault-query";

test("parseVaultSearchParams normalizes filters and clamps pagination", () => {
  const query = parseVaultSearchParams({
    page: "3",
    pageSize: "500",
    archived: "1",
    difficulties: "NORMAL,HARD",
    tags: "Grammar,Vocab",
    trackIds: "track-1,track-2",
    trackId: "track-3",
    search: " linking ",
    sort: "dr",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-20",
  });

  assert.equal(query.page, 3);
  assert.equal(query.pageSize, MAX_VAULT_PAGE_SIZE);
  assert.equal(query.showArchived, true);
  assert.deepEqual(query.selectedDifficulties, ["NORMAL", "HARD"]);
  assert.deepEqual(query.selectedTags, ["Grammar", "Vocab"]);
  assert.deepEqual(query.selectedTrackIds, ["track-1", "track-2"]);
  assert.equal(query.initialTrackId, "track-3");
  assert.equal(query.searchQuery, "linking");
  assert.equal(query.sortBy, "dr");
  assert.equal(query.dateFrom, "2026-05-01");
  assert.equal(query.dateTo, "2026-05-20");
});

test("parseVaultSearchParams falls back to a small first page for bad pagination", () => {
  const query = parseVaultSearchParams({ page: "-1", pageSize: "nope", sort: "unknown" });

  assert.equal(query.page, 1);
  assert.equal(query.pageSize, DEFAULT_VAULT_PAGE_SIZE);
  assert.equal(query.sortBy, "createdAt");
});

test("buildVaultFindManyArgs bounds first paint and keeps full notes out of the list payload", () => {
  const query = parseVaultSearchParams({ page: "2", pageSize: "75", search: "alpha" });
  const args = buildVaultFindManyArgs(query);

  assert.equal(args.take, 75);
  assert.equal(args.skip, 75);
  assert.equal("userNote" in args.select, false);
  assert.equal(args.select.sentence.select.track.select.audioUrl, true);
});

test("buildVaultPlaybackFindManyArgs keeps Play All complete without loading notes or tags", () => {
  const query = parseVaultSearchParams({ difficulties: "HARD", search: "alpha" });
  const args = buildVaultPlaybackFindManyArgs(query);

  assert.equal("take" in args, false);
  assert.equal("skip" in args, false);
  assert.equal("userNote" in args.select, false);
  assert.equal("tags" in args.select, false);
  assert.equal(args.select.sentence.select.text, true);
  assert.equal(args.select.sentence.select.track.select.audioUrl, true);
});

test("buildVaultWhere applies list filters on the server", () => {
  const query = parseVaultSearchParams({
    difficulties: "HARD",
    tags: "Grammar,Vocab",
    trackIds: "track-1",
    search: "alpha",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-20",
  });
  const where = buildVaultWhere(query);

  assert.equal(where.isArchived, false);
  assert.deepEqual(where.difficulty, { in: ["HARD"] });
  assert.deepEqual(where.sentence, { trackId: { in: ["track-1"] } });
  assert.deepEqual(where.AND, [
    { tags: { some: { name: "Grammar" } } },
    { tags: { some: { name: "Vocab" } } },
  ]);
  assert.ok(where.OR);
  assert.ok(where.createdAt);
});

test("buildVaultExportWhere ignores list-only search and tag filters", () => {
  const query = parseVaultSearchParams({
    difficulties: "HARD",
    tags: "Grammar",
    search: "alpha",
    trackIds: "track-1",
    dateFrom: "2026-05-01",
  });

  assert.deepEqual(buildVaultExportWhere(query), {
    isArchived: false,
    difficulty: { in: ["HARD"] },
    sentence: { trackId: { in: ["track-1"] } },
    createdAt: { gte: new Date("2026-05-01") },
  });
});
