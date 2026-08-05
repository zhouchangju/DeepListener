import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { attachImportSubtitle, createImportJob } from "./create";
import { readManifest } from "./manifest";
import { runImportJob, type ImportJobDatabase } from "./run";

function createWav(): Uint8Array {
  const sampleRate = 8_000;
  const samples = sampleRate;
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

function source(name: string, body: Uint8Array | string, type: string) {
  const blob = new Blob([body], { type });
  return { name, type, size: blob.size, stream: blob.stream() };
}

test("subtitle activation creates exactly one Track and cleans staging after success", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "deeplistener-import-activation-"));
  const tracks = new Map<string, { id: string; title: string; audioUrl: string; mediaType: string; sentences: unknown[] }>();
  const database = {
    track: {
      async create({ data }: { data: { id: string; title: string; audioUrl: string; mediaType: string; sentences: { create: unknown[] } } }) {
        if (tracks.has(data.id)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
        const track = { id: data.id, title: data.title, audioUrl: data.audioUrl, mediaType: data.mediaType, sentences: data.sentences.create };
        tracks.set(track.id, track);
        return track;
      },
      async findUnique({ where }: { where: { id: string } }) {
        return tracks.get(where.id) ?? null;
      },
    },
  } as unknown as ImportJobDatabase;
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.wav", createWav(), "audio/wav"), layout);
    await attachImportSubtitle(
      job.id,
      source("lesson.srt", "1\n00:00:00,000 --> 00:00:01,000\nHello learner", "application/x-subrip"),
      layout,
    );
    const first = await runImportJob(job.id, undefined, layout, database);
    assert.equal(first.status, "ACTIVATED");
    assert.ok(first.trackId);
    assert.equal(tracks.size, 1);
    assert.equal((await readManifest(job.id, layout))?.status, "ACTIVATED");

    const second = await runImportJob(job.id, undefined, layout, database);
    assert.equal(second.trackId, first.trackId);
    assert.equal(tracks.size, 1);
    assert.equal((await readManifest(job.id, layout))?.status, "ACTIVATED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
