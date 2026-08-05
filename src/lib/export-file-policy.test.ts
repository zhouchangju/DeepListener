import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  formatIncompleteExportMessage,
  resolveExportSource,
} from "./export-file-policy";

test("resolveExportSource rejects invalid stored audio urls", () => {
  const result = resolveExportSource(
    { label: "Track A", audioUrl: "../outside.mp3" },
    () => true,
  );

  assert.deepEqual(result, {
    issue: {
      label: "Track A",
      audioUrl: "../outside.mp3",
      reason: "invalid-url",
    },
  });
});

test("resolveExportSource rejects missing selected audio files", () => {
  const result = resolveExportSource(
    { label: "Track B", audioUrl: "/uploads/missing.mp3" },
    () => false,
  );

  assert.deepEqual(result, {
    issue: {
      label: "Track B",
      audioUrl: "/uploads/missing.mp3",
      reason: "missing-file",
    },
  });
});

test("resolveExportSource returns the stored path for existing uploaded audio", () => {
  const result = resolveExportSource(
    { label: "Track C", audioUrl: "/uploads/audio.mp3" },
    () => true,
  );

  assert.deepEqual(result, {
    audioPath: path.join(process.cwd(), "public", "uploads", "audio.mp3"),
  });
});

test("resolveExportSource accepts the bundled Demo audio path", () => {
  const result = resolveExportSource(
    { label: "DeepListener Demo", audioUrl: "/demo/demo-listening.mp3" },
    () => true,
  );

  assert.deepEqual(result, {
    audioPath: path.join(process.cwd(), "public", "demo", "demo-listening.mp3"),
  });
});

test("resolveExportSource rejects Demo path traversal", () => {
  const result = resolveExportSource(
    { label: "DeepListener Demo", audioUrl: "/demo/../uploads/audio.mp3" },
    () => true,
  );

  assert.deepEqual(result, {
    issue: {
      label: "DeepListener Demo",
      audioUrl: "/demo/../uploads/audio.mp3",
      reason: "invalid-url",
    },
  });
});

test("formatIncompleteExportMessage explains that selected sources were not exported", () => {
  assert.match(
    formatIncompleteExportMessage("sentences", 4, [
      { label: "Track A", audioUrl: "/uploads/a.mp3", reason: "missing-file" },
      { label: "Track B", audioUrl: "/escape.mp3", reason: "invalid-url" },
    ]),
    /Cannot export 4 sentences because 2 selected audio sources are unavailable or invalid/,
  );
});
