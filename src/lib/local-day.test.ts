import test from "node:test";
import assert from "node:assert/strict";
import {
  addLocalDays,
  endOfLocalDay,
  localDateKey,
  startOfLocalDay,
} from "./local-day";

test("local day helpers preserve calendar dates in local time", () => {
  const date = new Date(2026, 5, 6, 15, 45, 30, 123);

  assert.equal(localDateKey(date), "2026-06-06");
  assert.equal(startOfLocalDay(date).getHours(), 0);
  assert.equal(startOfLocalDay(date).getMinutes(), 0);
  assert.equal(endOfLocalDay(date).getHours(), 23);
  assert.equal(endOfLocalDay(date).getMinutes(), 59);
});

test("addLocalDays moves by local calendar days", () => {
  const date = new Date(2026, 0, 31, 10, 0, 0, 0);
  const next = addLocalDays(date, 1);

  assert.equal(localDateKey(next), "2026-02-01");
  assert.equal(next.getHours(), 10);
});
