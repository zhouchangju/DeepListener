import test from "node:test";
import assert from "node:assert/strict";
import {
  badRequest,
  internalServerError,
  internalServerErrorFrom,
  internalServerErrorSafe,
  jsonError,
  notFound,
} from "./api-response";

test("jsonError returns a JSON response with a status code", async () => {
  const response = jsonError("Invalid input", 422);

  assert.equal(response.status, 422);
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Invalid input" });
});

test("named helpers keep client-safe messages", async () => {
  assert.equal(badRequest("Bad").status, 400);
  assert.equal(notFound("Missing").status, 404);

  const response = internalServerError();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
});

test("internalServerErrorSafe forwards whitelisted codes only", async () => {
  const safe = internalServerErrorSafe({ code: "TRANSCRIPTION_TIMEOUT" });
  assert.equal(safe.status, 500);
  assert.deepEqual(await safe.json(), {
    error: "Internal server error",
    code: "TRANSCRIPTION_TIMEOUT",
  });

  // Unknown code must be collapsed so we never leak ad-hoc strings.
  const filtered = internalServerErrorSafe(
    { code: "SQLITE_CONSTRAINT_FOREIGN_KEY" } as unknown as Parameters<typeof internalServerErrorSafe>[0],
  );
  assert.deepEqual(await filtered.json(), { error: "Internal server error" });
});

test("internalServerErrorFrom logs and tags the known safe code", async () => {
  const response = internalServerErrorFrom(new Error("boom"), "DB_CONSTRAINT");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Internal server error",
    code: "DB_CONSTRAINT",
  });
});
