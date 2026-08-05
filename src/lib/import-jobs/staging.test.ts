import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { importJobStagingDirectory, resolveArtifactPath } from "./manifest";
import { hasSufficientSpace, promoteArtifact } from "./staging";
import type { ImportJobManifest } from "./types";

test("disk preflight preserves a reserve for manifest and derived output", () => {
  assert.equal(hasSufficientSpace(100, 60, 32), true);
  assert.equal(hasSufficientSpace(91, 60, 32), false);
  assert.equal(hasSufficientSpace(1, -1), false);
});

test("promotion keeps operation staging until activation is durable", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-import-promotion-"));
  const layout = { root, mode: "desktop" as const };
  const manifest: ImportJobManifest = {
    version: 1,
    id: "123e4567-e89b-42d3-a456-426614174001",
    status: "ACTIVATING",
    mediaKind: "AUDIO",
    displayName: "lesson",
    originalName: "lesson.mp3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phase: "activating",
    artifacts: [{ kind: "source", storageKey: "source/lesson.mp3", originalName: "lesson.mp3" }],
  };
  try {
    const artifact = manifest.artifacts[0];
    const sourcePath = resolveArtifactPath(manifest, artifact, layout);
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, "staged audio");
    const promoted = await promoteArtifact(manifest, artifact, layout);
    assert.equal(await readFile(sourcePath, "utf8"), "staged audio");
    assert.equal((await stat(promoted.path)).isFile(), true);
    assert.equal(await readFile(promoted.path, "utf8"), "staged audio");
    assert.equal(importJobStagingDirectory(manifest.id, layout).startsWith(root), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
