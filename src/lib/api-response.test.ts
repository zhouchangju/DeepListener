import test from "node:test";
import assert from "node:assert/strict";
import { badRequest, internalServerError, jsonError, notFound } from "./api-response";

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
