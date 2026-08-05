import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { attachImportSubtitle, createImportJob } from "./create";
import { importJobStagingDirectory, readManifest, writeManifest } from "./manifest";

function source(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  return { name, type, size: blob.size, stream: blob.stream() };
}

test("creates a staged audio operation and attaches a valid sidecar", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-create-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    assert.equal(job.status, "READY");
    const subtitle = await attachImportSubtitle(job.id, source("lesson.srt", "1\n00:00:00,000 --> 00:00:01,000\nHello", "application/x-subrip"), layout);
    assert.equal(subtitle.hasSubtitle, true);
    const manifest = await readManifest(job.id, layout);
    assert.equal(manifest?.subtitleFormat, "srt");
    const sourcePath = path.join(importJobStagingDirectory(job.id, layout), "source", "lesson.mp3");
    assert.equal((await stat(sourcePath)).isFile(), true);
    assert.equal((await readFile(sourcePath, "utf8")), "fake-audio");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects malformed sidecars without leaving subtitle artifacts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-invalid-subtitle-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.wav", "fake-audio", "audio/wav"), layout);
    await assert.rejects(
      attachImportSubtitle(job.id, source("bad.vtt", "not webvtt", "text/vtt"), layout),
      /subtitle/i,
    );
    const manifest = await readManifest(job.id, layout);
    assert.equal(manifest?.artifacts.some((artifact) => artifact.kind === "subtitle"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a stream whose declared size does not match the received bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-size-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const blob = new Blob(["short"], { type: "audio/mpeg" });
    await assert.rejects(
      createImportJob({ name: "lesson.mp3", type: "audio/mpeg", size: blob.size + 1, stream: blob.stream() }, layout),
      /size did not match/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not replace a subtitle while transcription is active", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-active-subtitle-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    const manifest = await readManifest(job.id, layout);
    assert.ok(manifest);
    await writeManifest({ ...manifest, status: "TRANSCRIBING", phase: "transcribing" }, layout);
    await assert.rejects(
      attachImportSubtitle(job.id, source("lesson.srt", "1\n00:00:00,000 --> 00:00:01,000\nHello", "application/x-subrip"), layout),
      /currently being processed/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a malformed subtitle replacement keeps the previously valid sidecar", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-subtitle-replace-"));
  const layout = { root, mode: "desktop" as const };
  try {
    const job = await createImportJob(source("lesson.mp3", "fake-audio", "audio/mpeg"), layout);
    const attached = await attachImportSubtitle(job.id, source("lesson.srt", "1\n00:00:00,000 --> 00:00:01,000\nHello", "application/x-subrip"), layout);
    assert.equal(attached.hasSubtitle, true);
    const before = await readManifest(job.id, layout);
    const previous = before?.artifacts.find((artifact) => artifact.kind === "subtitle");
    assert.ok(previous);
    const previousPath = path.join(importJobStagingDirectory(job.id, layout), previous.storageKey);
    await stat(previousPath);

    await assert.rejects(
      attachImportSubtitle(job.id, source("lesson.srt", "not valid", "application/x-subrip"), layout),
      /subtitle/i,
    );
    const after = await readManifest(job.id, layout);
    assert.equal(after?.artifacts.find((artifact) => artifact.kind === "subtitle")?.storageKey, previous.storageKey);
    assert.equal(await readFile(previousPath, "utf8"), "1\n00:00:00,000 --> 00:00:01,000\nHello");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
