import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, requireOkResponse } from "./client-response";

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

test("requireOkResponse surfaces whitelisted safe codes for branching UX", async () => {
  try {
    await requireOkResponse(
      Response.json(
        { error: "Internal server error", code: "TRANSCRIPTION_TIMEOUT" },
        { status: 500 },
      ),
      "Operation failed",
    );
    assert.fail("expected requireOkResponse to reject");
  } catch (err) {
    assert.ok(err instanceof ApiError, "should throw ApiError");
    assert.equal((err as ApiError).code, "TRANSCRIPTION_TIMEOUT");
    assert.equal((err as ApiError).status, 500);
  }
});

test("requireOkResponse leaves code undefined when server omits it", async () => {
  try {
    await requireOkResponse(
      Response.json({ error: "Internal server error" }, { status: 500 }),
      "Operation failed",
    );
    assert.fail("expected requireOkResponse to reject");
  } catch (err) {
    assert.ok(err instanceof ApiError);
    assert.equal((err as ApiError).code, undefined);
  }
});
