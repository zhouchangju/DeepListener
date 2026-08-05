import assert from "node:assert/strict";
import { access, mkdir, stat, utimes } from "node:fs/promises";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { createImportJob } from "./create";
import { importJobDirectory, importJobStagingDirectory, readManifest, resolveArtifactPath } from "./manifest";
import { runImportJob, type ImportJobDatabase, type TranscriptionProviderFactory } from "./run";
import type { TranscriptionResponse } from "@/lib/transcription/types";

function source(name = "lesson.mp3", body = "fake-audio") {
  const blob = new Blob([body], { type: "audio/mpeg" });
  return { name, type: "audio/mpeg", size: blob.size, stream: blob.stream() };
}

function response(text = "Hello learner"): TranscriptionResponse {
  return {
    fullText: text,
    segments: [{ text, start: 0, end: 1 }],
    rawJson: JSON.stringify({ source: "fake-provider", text }),
  };
}

function fakeDatabase(): ImportJobDatabase {
  const tracks = new Map<string, {
    id: string;
    title: string;
    audioUrl: string;
    mediaType: string;
    sentences: unknown[];
  }>();
  return {
    track: {
      async create({ data }: {
        data: {
          id: string;
          title: string;
          audioUrl: string;
          mediaType: string;
          sentences: { create: unknown[] };
        };
      }) {
        if (tracks.has(data.id)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
        const track = {
          id: data.id,
          title: data.title,
          audioUrl: data.audioUrl,
          mediaType: data.mediaType,
          sentences: data.sentences.create,
        };
        tracks.set(track.id, track);
        return track;
      },
      async findUnique({ where }: { where: { id: string } }) {
        return tracks.get(where.id) ?? null;
      },
    },
  } as unknown as ImportJobDatabase;
}

async function sourceStillStaged(id: string, layout: { root: string; mode: "desktop" }): Promise<boolean> {
  const manifest = await readManifest(id, layout);
  const artifact = manifest?.artifacts.find((item) => item.kind === "source");
  if (!manifest || !artifact) return false;
  try {
    await stat(resolveArtifactPath(manifest, artifact, layout));
    return true;
  } catch {
    return false;
  }
}

test("provider quota failure preserves the source and change-provider retry activates once", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-provider-retry-"));
  const layout = { root, mode: "desktop" as const };
  const database = fakeDatabase();
  try {
    const job = await createImportJob(source(), layout);
    const calls: string[] = [];
    const failingThenSuccessful: TranscriptionProviderFactory = (provider) => {
      calls.push(provider);
      if (provider === "deepgram") {
        return { transcribe: async () => { throw new Error("429 quota exceeded"); } };
      }
      return { transcribe: async () => response() };
    };

    const failed = await runImportJob(job.id, "deepgram", layout, database, failingThenSuccessful);
    assert.equal(failed.status, "FAILED");
    assert.equal(failed.error?.code, "PROVIDER_REQUEST_FAILED");
    assert.equal(failed.provider, "deepgram");
    assert.equal((await readManifest(job.id, layout))?.attempt?.status, "FAILED");
    assert.equal(await sourceStillStaged(job.id, layout), true);

    const activated = await runImportJob(job.id, "openai", layout, database, failingThenSuccessful);
    assert.equal(activated.status, "ACTIVATED");
    assert.equal(activated.provider, "openai");
    assert.equal((await readManifest(job.id, layout))?.attempt?.status, "SUCCEEDED");
    assert.deepEqual(calls, ["deepgram", "openai"]);
    assert.equal(await sourceStillStaged(job.id, layout), false);
    // The operation ID is the Track ID; a retry cannot create a second row.
    assert.equal((await readManifest(job.id, layout))?.trackId, job.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("provider timeout is recorded as retryable and keeps operation staging", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-provider-timeout-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("short.mp3"), layout);
    const never: TranscriptionProviderFactory = () => ({
      transcribe: async () => new Promise<TranscriptionResponse>(() => undefined),
    });
    const result = await runImportJob(job.id, "google", layout, fakeDatabase(), never, 10);
    assert.equal(result.status, "FAILED");
    assert.equal(result.error?.code, "TRANSCRIPTION_TIMEOUT");
    const manifest = await readManifest(job.id, layout);
    assert.equal(manifest?.attempt?.status, "TIMED_OUT");
    assert.equal(await sourceStillStaged(job.id, layout), true);
    // The operation directory remains discoverable for the recovery UI.
    await stat(importJobStagingDirectory(job.id, layout));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a late provider response cannot reactivate a timed-out operation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-provider-late-"));
  const layout = { root, mode: "desktop" as const };
  const database = fakeDatabase();
  try {
    const job = await createImportJob(source("late.mp3"), layout);
    const lateProvider: TranscriptionProviderFactory = () => ({
      transcribe: async () => new Promise<TranscriptionResponse>((resolve) => {
        setTimeout(() => resolve(response("late result")), 40);
      }),
    });
    const result = await runImportJob(job.id, "deepgram", layout, database, lateProvider, 5);
    assert.equal(result.status, "FAILED");
    assert.equal(result.error?.code, "TRANSCRIPTION_TIMEOUT");
    await new Promise((resolve) => setTimeout(resolve, 70));
    const manifest = await readManifest(job.id, layout);
    assert.equal(manifest?.status, "FAILED");
    assert.equal(manifest?.attempt?.status, "TIMED_OUT");
    assert.equal(manifest?.trackId, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("database activation failure keeps promoted media and can resume without a second Track", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-db-retry-"));
  const layout = { root, mode: "desktop" as const };
  const tracks = new Map<string, unknown>();
  let failCreate = true;
  const database: ImportJobDatabase = {
    track: {
      async create({ data }: { data: { id: string; title: string; audioUrl: string; mediaType: string; sentences: { create: unknown[] } } }) {
        if (failCreate) throw new Error("database offline");
        const track = { id: data.id, title: data.title, audioUrl: data.audioUrl, mediaType: data.mediaType, sentences: data.sentences.create };
        tracks.set(track.id, track);
        return track;
      },
      async findUnique({ where }: { where: { id: string } }) {
        return tracks.get(where.id) ?? null;
      },
    },
  } as unknown as ImportJobDatabase;
  try {
    const job = await createImportJob(source("db-failure.mp3"), layout);
    const provider: TranscriptionProviderFactory = () => ({ transcribe: async () => response("Recovered sentence") });

    const failed = await runImportJob(job.id, "deepgram", layout, database, provider);
    assert.equal(failed.status, "FAILED");
    assert.equal(failed.error?.code, "IMPORT_FAILED");
    assert.equal(await sourceStillStaged(job.id, layout), true);

    const promotedPath = path.join(root, "media", "audio", `${job.id}-db-failure.mp3`);
    await access(promotedPath);
    failCreate = false;

    const resumed = await runImportJob(job.id, "deepgram", layout, database, provider);
    assert.equal(resumed.status, "ACTIVATED");
    assert.equal(tracks.size, 1);
    assert.equal(await sourceStillStaged(job.id, layout), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a stale operation lock left by a killed process is recovered safely", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-stale-lock-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("stale-lock.mp3"), layout);
    const lockDir = path.join(importJobDirectory(job.id, layout), ".lock");
    await mkdir(lockDir, { recursive: true });
    const stale = new Date(Date.now() - 31 * 60 * 1000);
    await utimes(lockDir, stale, stale);

    const result = await runImportJob(
      job.id,
      "deepgram",
      layout,
      fakeDatabase(),
      () => ({ transcribe: async () => response("Recovered after restart") }),
    );
    assert.equal(result.status, "ACTIVATED");
    await assert.rejects(stat(lockDir), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a killed import process can be restarted and resumed from its manifest", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-process-restart-"));
  const layout = { root, mode: "desktop" as const };
  let child: ChildProcessWithoutNullStreams | undefined;
  try {
    const createUrl = pathToFileURL(path.resolve(process.cwd(), "src/lib/import-jobs/create.ts")).href;
    const runUrl = pathToFileURL(path.resolve(process.cwd(), "src/lib/import-jobs/run.ts")).href;
    const childScript = `
      const { createImportJob } = (await import(${JSON.stringify(createUrl)})).default;
      const { runImportJob } = (await import(${JSON.stringify(runUrl)})).default;
      const root = process.env.TEST_IMPORT_ROOT;
      const layout = { root, mode: "desktop" };
      const blob = new Blob(["child-process-audio"], { type: "audio/mpeg" });
      const job = await createImportJob({ name: "killed.mp3", type: "audio/mpeg", size: blob.size, stream: blob.stream() }, layout);
      console.log("JOB:" + job.id);
      await runImportJob(
        job.id,
        "deepgram",
        layout,
        { track: { create: async () => { throw new Error("should not activate"); }, findUnique: async () => null } },
        () => ({ transcribe: async () => new Promise(() => undefined) }),
      );
    `;
    child = spawn(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", childScript],
      {
        cwd: process.cwd(),
        env: { ...process.env, TEST_IMPORT_ROOT: root, DEEPLISTENER_DATA_DIR: root },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    let errorOutput = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { output += chunk; });
    child.stderr.on("data", (chunk: string) => { errorOutput += chunk; });
    const deadline = Date.now() + 8_000;
    let jobId: string | undefined;
    while (!jobId && Date.now() < deadline) {
      const match = /JOB:([0-9a-f-]+)/i.exec(output);
      if (match) {
        jobId = match[1];
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.ok(jobId, `child did not announce an operation: ${output}\n${errorOutput}`);

    const lockDir = path.join(importJobDirectory(jobId, layout), ".lock");
    let ready = false;
    while (!ready && Date.now() < deadline) {
      const manifest = await readManifest(jobId, layout);
      try {
        await stat(lockDir);
        ready = manifest?.status === "TRANSCRIBING" && Boolean(manifest.attempt);
      } catch {
        // The child has not entered the provider call yet.
      }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(ready, true, "child must persist TRANSCRIBING state and lock before termination");

    child.kill();
    await new Promise<void>((resolve) => child?.once("exit", () => resolve()));
    // Give the OS a moment to flush the lock mtime, then use a tiny injected
    // stale threshold to model the passage of the production 30-minute bound.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const resumed = await runImportJob(
      jobId,
      "openai",
      layout,
      fakeDatabase(),
      () => ({ transcribe: async () => response("Resumed after process restart") }),
      1_000,
      10,
    );
    assert.equal(resumed.status, "ACTIVATED");
    assert.equal((await readManifest(jobId, layout))?.attempt?.provider, "openai");
  } finally {
    if (child && child.exitCode === null) child.kill();
    await rm(root, { recursive: true, force: true });
  }
});
