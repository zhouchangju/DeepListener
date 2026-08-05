import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { NextRequest } from "next/server";
import { POST, PUT } from "./route";
import { cancelImportJob } from "@/lib/import-jobs/cleanup";
import { importJobStagingDirectory, readManifest } from "@/lib/import-jobs/manifest";

const original = {
  dataRoot: process.env.DEEPLISTENER_DATA_DIR,
  provider: process.env.TRANSCRIPTION_PROVIDER,
  deepgram: process.env.DEEPGRAM_API_KEY,
};
let root = "";

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), "deeplistener-upload-recovery-"));
  process.env.DEEPLISTENER_DATA_DIR = root;
  process.env.TRANSCRIPTION_PROVIDER = "deepgram";
  delete process.env.DEEPGRAM_API_KEY;
});

after(async () => {
  if (original.dataRoot === undefined) delete process.env.DEEPLISTENER_DATA_DIR;
  else process.env.DEEPLISTENER_DATA_DIR = original.dataRoot;
  if (original.provider === undefined) delete process.env.TRANSCRIPTION_PROVIDER;
  else process.env.TRANSCRIPTION_PROVIDER = original.provider;
  if (original.deepgram === undefined) delete process.env.DEEPGRAM_API_KEY;
  else process.env.DEEPGRAM_API_KEY = original.deepgram;
  await rm(root, { recursive: true, force: true });
});

test("legacy single upload preserves the staged source after provider setup failure", async () => {
  const body = new TextEncoder().encode("audio bytes");
  const response = await POST(new NextRequest("http://localhost/api/upload", {
    method: "POST",
    headers: {
      "content-type": "audio/mpeg",
      "x-deeplistener-file-name": encodeURIComponent("lesson.mp3"),
      "x-deeplistener-file-size": String(body.byteLength),
    },
    body,
  }));
  assert.equal(response.status, 502);
  const payload = await response.json() as { operationId: string; job: { status: string } };
  assert.equal(payload.job.status, "FAILED");
  const manifest = await readManifest(payload.operationId);
  assert.equal(manifest?.status, "FAILED");
  const sourceKey = manifest?.artifacts.find((artifact) => artifact.kind === "source")?.storageKey;
  assert.ok(sourceKey);
  const sourcePath = path.join(importJobStagingDirectory(payload.operationId), sourceKey);
  await access(sourcePath);
  assert.equal(await readFile(sourcePath, "utf8"), "audio bytes");
  await cancelImportJob(payload.operationId);
});

test("batch upload preserves each failed operation for recovery", async () => {
  const form = new FormData();
  form.append("files", new File(["batch audio"], "batch.mp3", { type: "audio/mpeg" }));
  const response = await PUT(new NextRequest("http://localhost/api/upload", {
    method: "PUT",
    body: form,
  }));
  assert.equal(response.status, 200);
  const payload = await response.json() as {
    success: unknown[];
    failed: Array<{ fileName: string; operationId?: string; code?: string }>;
  };
  assert.equal(payload.success.length, 0);
  assert.equal(payload.failed.length, 1);
  assert.equal(payload.failed[0].fileName, "batch.mp3");
  assert.match(payload.failed[0].operationId ?? "", /^[0-9a-f-]{36}$/i);
  assert.equal(payload.failed[0].code, "PROVIDER_NOT_CONFIGURED");

  const operationId = payload.failed[0].operationId;
  assert.ok(operationId);
  const manifest = await readManifest(operationId);
  const sourceKey = manifest?.artifacts.find((artifact) => artifact.kind === "source")?.storageKey;
  assert.ok(sourceKey);
  await access(path.join(importJobStagingDirectory(operationId), sourceKey));
  await cancelImportJob(operationId);
});
