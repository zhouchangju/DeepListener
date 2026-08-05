import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { attachImportSubtitle, createImportJob } from "./create";
import { cancelImportJob } from "./cleanup";
import { importJobDirectory, readManifest, writeManifest } from "./manifest";
import { runImportJob, type ImportJobDatabase, type TranscriptionProviderFactory } from "./run";
import type { TranscriptionResponse } from "@/lib/transcription/types";

function source(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  return { name, type, size: blob.size, stream: blob.stream() };
}

test("a canceled operation remains canceled when a resume request arrives", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-cancelled-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    const manifest = await readManifest(job.id, layout);
    assert.ok(manifest);
    await writeManifest({ ...manifest, status: "CANCELED", phase: "canceled" }, layout);
    const resumed = await runImportJob(job.id, undefined, layout);
    assert.equal(resumed.status, "CANCELED");
    assert.equal((await readManifest(job.id, layout))?.status, "CANCELED");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a live operation lock fences duplicate processing", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-lock-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    const lockDir = path.join(importJobDirectory(job.id, layout), ".lock");
    await mkdir(lockDir, { recursive: true });
    const now = new Date();
    await utimes(lockDir, now, now);
    await assert.rejects(runImportJob(job.id, undefined, layout), /already being processed/i);
    await cancelImportJob(job.id, layout);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a valid SRT sidecar activates without constructing or calling a Provider", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-subtitle-privacy-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    await attachImportSubtitle(
      job.id,
      source("lesson.srt", "1\n00:00:00,000 --> 00:00:01,000\nA private sentence", "application/x-subrip"),
      layout,
    );

    const providerCalls: string[] = [];
    const result = await runImportJob(
      job.id,
      "deepgram",
      layout,
      {
        track: {
          async create({ data }: { data: { id: string; title: string; audioUrl: string; mediaType: string; sentences: { create: unknown[] } } }) {
            return {
              id: data.id,
              title: data.title,
              audioUrl: data.audioUrl,
              mediaType: data.mediaType,
              sentences: data.sentences.create,
            };
          },
          async findUnique() {
            return null;
          },
        },
      },
      (provider) => {
        providerCalls.push(provider);
        throw new Error("A sidecar import must not construct a Provider.");
      },
    );

    assert.equal(result.status, "ACTIVATED");
    assert.deepEqual(providerCalls, []);
    assert.equal(result.provider, "deepgram");
    const manifest = await readManifest(job.id, layout);
    assert.equal(manifest?.status, "ACTIVATED");
    assert.doesNotMatch(JSON.stringify(manifest), /api[_-]?key|secret|token/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("credential-scoped provider factory receives only the selected provider credential", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-credential-scope-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    const configs: Array<{ provider: string; apiKey?: string; baseUrl?: string }> = [];
    const factory = Object.assign(
      ((provider: string, config?: { apiKey: string; baseUrl?: string }) => {
        configs.push({ provider, ...config });
        return {
          transcribe: async (): Promise<TranscriptionResponse> => ({
            fullText: "Scoped sentence",
            segments: [{ text: "Scoped sentence", start: 0, end: 1 }],
            rawJson: JSON.stringify({ source: "test" }),
          }),
        };
      }) as TranscriptionProviderFactory,
      { credentialScope: true },
    );
    const database: ImportJobDatabase = {
      track: {
        async create({ data }: { data: { id: string; title: string; audioUrl: string; mediaType: string; sentences: { create: unknown[] } } }) {
          return { id: data.id, title: data.title, audioUrl: data.audioUrl, mediaType: data.mediaType, sentences: data.sentences.create };
        },
        async findUnique() {
          return null;
        },
      },
    } as unknown as ImportJobDatabase;

    const reader = async (provider: "deepgram" | "openai" | "google", operation: (credential: string) => Promise<unknown>) => {
      assert.equal(provider, "openai");
      return operation("selected-openai-secret");
    };
    const result = await runImportJob(job.id, "openai", layout, database, factory, undefined, undefined, reader);

    assert.equal(result.status, "ACTIVATED");
    assert.deepEqual(configs, [{ provider: "openai", apiKey: "selected-openai-secret" }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
