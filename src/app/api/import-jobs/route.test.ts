import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { DELETE, GET as GET_ONE } from "./[id]/route";

const originalDataRoot = process.env.DEEPLISTENER_DATA_DIR;
let dataRoot = "";

before(async () => {
  dataRoot = await mkdtemp(path.join(tmpdir(), "deeplistener-import-route-"));
  process.env.DEEPLISTENER_DATA_DIR = dataRoot;
});

after(async () => {
  if (originalDataRoot === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
  else process.env.DEEPLISTENER_DATA_DIR = originalDataRoot;
  await rm(dataRoot, { recursive: true, force: true });
});

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

test("creates and lists a streamed import operation without exposing absolute paths", async () => {
  const body = new TextEncoder().encode("fake audio");
  const request = new NextRequest("http://localhost/api/import-jobs", {
    method: "POST",
    headers: {
      "content-type": "audio/mpeg",
      "x-deeplistener-file-name": encodeURIComponent("lesson.mp3"),
      "x-deeplistener-file-size": String(body.byteLength),
    },
    body,
  });
  const response = await POST(request);
  assert.equal(response.status, 201);
  const payload = await response.json() as { operationId: string; job: { status: string } };
  assert.match(payload.operationId, /^[0-9a-f-]{36}$/i);
  assert.equal(payload.job.status, "READY");

  const listResponse = await GET();
  const list = await listResponse.json() as { jobs: Array<{ id: string; displayName: string }> };
  assert.equal(list.jobs.length, 1);
  assert.equal(list.jobs[0].id, payload.operationId);
  assert.doesNotMatch(JSON.stringify(list), /[A-Z]:\\|\/Users\/|\/home\//);

  const statusResponse = await GET_ONE(new NextRequest("http://localhost/api/import-jobs/x"), routeContext(payload.operationId));
  assert.equal(statusResponse.status, 200);

  const deleteResponse = await DELETE(
    new NextRequest("http://localhost/api/import-jobs/x", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    }),
    routeContext(payload.operationId),
  );
  assert.equal(deleteResponse.status, 200);
});

test("rejects missing stream metadata before creating an operation", async () => {
  const response = await POST(new NextRequest("http://localhost/api/import-jobs", {
    method: "POST",
    headers: { "content-type": "audio/mpeg" },
    body: "data",
  }));
  assert.equal(response.status, 400);
});
