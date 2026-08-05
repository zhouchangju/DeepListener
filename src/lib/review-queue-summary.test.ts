import assert from "node:assert/strict";
import test from "node:test";
import { getDueReviewItemIds } from "./review-queue-summary";

test("keeps due items that have not been reviewed today", () => {
  assert.deepEqual(
    getDueReviewItemIds(["a", "b"], [{ reviewItemId: "a", rating: 3 }]),
    ["b"],
  );
});

test("keeps again and hard items for relearning", () => {
  assert.deepEqual(
    getDueReviewItemIds(
      ["again", "hard", "good", "easy"],
      [
        { reviewItemId: "again", rating: 1 },
        { reviewItemId: "hard", rating: 2 },
        { reviewItemId: "good", rating: 3 },
        { reviewItemId: "easy", rating: 4 },
      ],
    ),
    ["again", "hard"],
  );
});

test("uses the latest maximum rating when a card has multiple logs", () => {
  assert.deepEqual(
    getDueReviewItemIds(
      ["relearning", "completed"],
      [
        { reviewItemId: "relearning", rating: 1 },
        { reviewItemId: "relearning", rating: 2 },
        { reviewItemId: "completed", rating: 1 },
        { reviewItemId: "completed", rating: 3 },
      ],
    ),
    ["relearning"],
  );
});

test("ignores logs for items that are not currently due", () => {
  assert.deepEqual(
    getDueReviewItemIds(["due"], [{ reviewItemId: "future", rating: 4 }]),
    ["due"],
  );
});
