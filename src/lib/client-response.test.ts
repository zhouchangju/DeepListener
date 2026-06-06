import test from "node:test";
import assert from "node:assert/strict";
import { requireOkResponse } from "./client-response";

test("requireOkResponse resolves successful mutation responses", async () => {
  await assert.doesNotReject(
    requireOkResponse(new Response(null, { status: 204 }), "Operation failed"),
  );
});

test("requireOkResponse uses server error text when available", async () => {
  await assert.rejects(
    requireOkResponse(
      Response.json({ error: "Track is locked" }, { status: 409 }),
      "Operation failed",
    ),
    /Track is locked/,
  );
});

test("requireOkResponse falls back for malformed error responses", async () => {
  await assert.rejects(
    requireOkResponse(new Response("not-json", { status: 500 }), "Operation failed"),
    /Operation failed/,
  );
});
