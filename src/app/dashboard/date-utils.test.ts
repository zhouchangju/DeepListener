import test from "node:test";
import assert from "node:assert/strict";
import { getCountdownDays } from "./date-utils";

test("getCountdownDays returns days remaining for future target dates", () => {
  const today = new Date("2026-05-17T10:00:00.000Z");
  const target = new Date("2026-05-20T00:00:00.000Z");

  assert.equal(getCountdownDays(today, target), 3);
});

test("getCountdownDays returns zero after the target date has passed", () => {
  const today = new Date("2026-05-17T10:00:00.000Z");
  const target = new Date("2026-05-16T00:00:00.000Z");

  assert.equal(getCountdownDays(today, target), 0);
});
