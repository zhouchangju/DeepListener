import test from "node:test";
import assert from "node:assert/strict";
import {
  filterVaultItems,
  formatReviewDateLabel,
  getAllVaultTags,
  getDifficultyStyle,
  getReviewDateTimestamp,
  toggleFilterSelection,
} from "./vault-items";

test("review date helpers prefer due, fall back to nextReview, and tolerate missing dates", () => {
  assert.equal(
    getReviewDateTimestamp({ due: new Date("2026-05-20T00:00:00.000Z"), nextReview: new Date("2026-05-21T00:00:00.000Z") }),
    new Date("2026-05-20T00:00:00.000Z").getTime()
  );
  assert.equal(
    getReviewDateTimestamp({ due: null, nextReview: new Date("2026-05-21T00:00:00.000Z") }),
    new Date("2026-05-21T00:00:00.000Z").getTime()
  );
  assert.equal(getReviewDateTimestamp({ due: null, nextReview: null }), Number.POSITIVE_INFINITY);
  assert.equal(formatReviewDateLabel({ due: null, nextReview: null }), "No review date");
});

test("filterVaultItems filters by archive state, track, difficulty, tags, and search query", () => {
  const result = filterVaultItems(vaultItems, {
    initialTrackId: "track-1",
    showArchived: false,
    selectedDifficulties: ["NORMAL"],
    selectedTags: ["Grammar", "Vocab"],
    searchQuery: "alpha",
    sortBy: "createdAt",
  });

  assert.deepEqual(result.map((item) => item.id), ["active-normal"]);
});

test("filterVaultItems sorts by review date, stability, fsrs difficulty, and creation date", () => {
  assert.deepEqual(
    filterVaultItems(vaultItems, baseOptions({ sortBy: "due" })).map((item) => item.id),
    ["active-normal", "active-hard", "active-no-date"]
  );
  assert.deepEqual(
    filterVaultItems(vaultItems, baseOptions({ sortBy: "stability" })).map((item) => item.id),
    ["active-hard", "active-normal", "active-no-date"]
  );
  assert.deepEqual(
    filterVaultItems(vaultItems, baseOptions({ sortBy: "dr" })).map((item) => item.id),
    ["active-hard", "active-normal", "active-no-date"]
  );
  assert.deepEqual(
    filterVaultItems(vaultItems, baseOptions({ sortBy: "createdAt" })).map((item) => item.id),
    ["active-no-date", "active-hard", "active-normal"]
  );
});

test("vault filter helpers keep UI state deterministic", () => {
  assert.deepEqual(getAllVaultTags(vaultItems), ["Grammar", "Vocab"]);
  assert.deepEqual(toggleFilterSelection("Grammar", [], ), ["Grammar"]);
  assert.deepEqual(toggleFilterSelection("Grammar", ["Grammar", "Vocab"]), ["Vocab"]);
  assert.equal(getDifficultyStyle("HARD"), "bg-orange-50 border-orange-200");
  assert.equal(getDifficultyStyle("VERY_HARD"), "bg-red-50 border-red-200");
  assert.equal(getDifficultyStyle("NORMAL"), "hover:border-indigo-200");
});

function baseOptions(overrides: Partial<Parameters<typeof filterVaultItems>[1]> = {}): Parameters<typeof filterVaultItems>[1] {
  return {
    initialTrackId: null,
    showArchived: false,
    selectedDifficulties: [],
    selectedTags: [],
    searchQuery: "",
    sortBy: "createdAt",
    ...overrides,
  };
}

const vaultItems = [
  item({
    id: "active-normal",
    text: "Alpha sentence",
    userNote: "Important note",
    trackId: "track-1",
    trackTitle: "Lecture Alpha",
    difficulty: null,
    tags: ["Grammar", "Vocab"],
    due: "2026-05-20T00:00:00.000Z",
    stability: 5,
    dr: 4,
    createdAt: "2026-05-10T00:00:00.000Z",
  }),
  item({
    id: "active-hard",
    text: "Beta sentence",
    userNote: "Second note",
    trackId: "track-1",
    trackTitle: "Lecture Beta",
    difficulty: "HARD",
    tags: ["Grammar"],
    due: "2026-05-22T00:00:00.000Z",
    stability: 2,
    dr: 9,
    createdAt: "2026-05-12T00:00:00.000Z",
  }),
  item({
    id: "active-no-date",
    text: "Gamma sentence",
    userNote: null,
    trackId: "track-2",
    trackTitle: "Interview Gamma",
    difficulty: "VERY_HARD",
    tags: ["Vocab"],
    due: null,
    nextReview: null,
    stability: 8,
    dr: null,
    createdAt: "2026-05-14T00:00:00.000Z",
  }),
  item({
    id: "archived",
    text: "Archived alpha",
    userNote: null,
    trackId: "track-1",
    trackTitle: "Lecture Alpha",
    difficulty: "NORMAL",
    tags: ["Grammar"],
    due: "2026-05-19T00:00:00.000Z",
    stability: 1,
    dr: 10,
    createdAt: "2026-05-15T00:00:00.000Z",
    isArchived: true,
  }),
];

function item({
  id,
  text,
  userNote,
  trackId,
  trackTitle,
  difficulty,
  tags,
  due,
  nextReview,
  stability,
  dr,
  createdAt,
  isArchived = false,
}: {
  id: string;
  text: string;
  userNote: string | null;
  trackId: string;
  trackTitle: string;
  difficulty: string | null;
  tags: string[];
  due: string | null;
  nextReview?: string | null;
  stability: number;
  dr: number | null;
  createdAt: string;
  isArchived?: boolean;
}) {
  return {
    id,
    userNote,
    difficulty,
    isArchived,
    due: due ? new Date(due) : null,
    nextReview: nextReview === undefined ? null : nextReview ? new Date(nextReview) : null,
    stability,
    dr,
    retrieval: 0,
    lapse: 0,
    createdAt: new Date(createdAt),
    tags: tags.map((name) => ({ id: name, name })),
    sentence: {
      text,
      startTime: 0,
      endTime: 1,
      track: {
        id: trackId,
        title: trackTitle,
        audioUrl: "/audio.mp3",
      },
    },
  };
}
