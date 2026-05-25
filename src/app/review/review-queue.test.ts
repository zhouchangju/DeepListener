import test from "node:test";
import assert from "node:assert/strict";
import { removeCurrentReviewItem } from "./review-queue";

test("removeCurrentReviewItem removes the current card and keeps the next card at the same index", () => {
  const transition = removeCurrentReviewItem({
    items: ["a", "b", "c"],
    currentIndex: 1,
  });

  assert.deepEqual(transition.items, ["a", "c"]);
  assert.equal(transition.currentIndex, 1);
  assert.equal(transition.completed, false);
});

test("removeCurrentReviewItem clamps the index when the last card is removed", () => {
  const transition = removeCurrentReviewItem({
    items: ["a", "b", "c"],
    currentIndex: 2,
  });

  assert.deepEqual(transition.items, ["a", "b"]);
  assert.equal(transition.currentIndex, 1);
  assert.equal(transition.completed, false);
});

test("removeCurrentReviewItem marks the queue complete after removing the only card", () => {
  const transition = removeCurrentReviewItem({
    items: ["a"],
    currentIndex: 0,
  });

  assert.deepEqual(transition.items, []);
  assert.equal(transition.currentIndex, 0);
  assert.equal(transition.completed, true);
});
