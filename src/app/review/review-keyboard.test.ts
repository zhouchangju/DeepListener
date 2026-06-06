import test from "node:test";
import assert from "node:assert/strict";
import { getReviewKeyboardAction } from "./review-keyboard";

test("review keyboard shortcuts are disabled while editing", () => {
  assert.equal(getReviewKeyboardAction({ key: " ", isEditing: true }), null);
  assert.equal(getReviewKeyboardAction({ key: "r", isEditing: true }), null);
  assert.equal(getReviewKeyboardAction({ key: "1", isEditing: true }), null);
});

test("review keyboard shortcuts map reveal and replay actions", () => {
  assert.deepEqual(getReviewKeyboardAction({ key: " ", isEditing: false }), {
    type: "toggle-answer",
    preventDefault: true,
  });
  assert.deepEqual(getReviewKeyboardAction({ key: "R", isEditing: false }), {
    type: "play-audio",
    preventDefault: true,
  });
});

test("review keyboard shortcuts map number keys to review grades", () => {
  assert.deepEqual(getReviewKeyboardAction({ key: "1", isEditing: false }), {
    type: "grade",
    quality: "again",
    preventDefault: false,
  });
  assert.deepEqual(getReviewKeyboardAction({ key: "2", isEditing: false }), {
    type: "grade",
    quality: "hard",
    preventDefault: false,
  });
  assert.deepEqual(getReviewKeyboardAction({ key: "3", isEditing: false }), {
    type: "grade",
    quality: "good",
    preventDefault: false,
  });
  assert.deepEqual(getReviewKeyboardAction({ key: "4", isEditing: false }), {
    type: "grade",
    quality: "easy",
    preventDefault: false,
  });
});

test("review keyboard shortcuts ignore unrelated keys", () => {
  assert.equal(getReviewKeyboardAction({ key: "Escape", isEditing: false }), null);
});
