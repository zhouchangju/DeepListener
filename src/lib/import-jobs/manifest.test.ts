import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { importJobManifestPath, importJobStagingDirectory, readManifest, resolveArtifactPath, writeManifest } from "./manifest";
import type { ImportJobManifest } from "./types";

test("import manifest writes safe relative ownership metadata atomically", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-manifest-"));
  const layout = { root, mode: "desktop" as const };
  const manifest: ImportJobManifest = {
    version: 1,
    id: "123e4567-e89b-42d3-a456-426614174000",
    status: "READY",
    mediaKind: "AUDIO",
    displayName: "lesson",
    originalName: "lesson.mp3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phase: "received",
    artifacts: [{ kind: "source", storageKey: "source/lesson.mp3", bytes: 10 }],
  };
  try {
    await writeManifest(manifest, layout);
    const read = await readManifest(manifest.id, layout);
    assert.equal(read?.id, manifest.id);
    assert.equal(importJobManifestPath(manifest.id, layout).startsWith(root), true);
    assert.equal(importJobStagingDirectory(manifest.id, layout).startsWith(root), true);
    assert.equal(resolveArtifactPath(manifest, manifest.artifacts[0], layout).startsWith(root), true);
    assert.throws(() => resolveArtifactPath(manifest, { kind: "source", storageKey: "../secret" }, layout), /artifact/i);
    assert.equal(JSON.parse(await readFile(importJobManifestPath(manifest.id, layout), "utf8")).version, 1);
    await stat(importJobManifestPath(manifest.id, layout));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
