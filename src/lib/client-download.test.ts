import test from "node:test";
import assert from "node:assert/strict";
import { getFilenameFromContentDisposition } from "./client-download";

test("getFilenameFromContentDisposition reads quoted filenames", () => {
  assert.equal(
    getFilenameFromContentDisposition('attachment; filename="DeepListener_Export.mp3"', "fallback.mp3"),
    "DeepListener_Export.mp3"
  );
});

test("getFilenameFromContentDisposition falls back for missing or unsafe names", () => {
  assert.equal(getFilenameFromContentDisposition(null, "fallback.mp3"), "fallback.mp3");
  assert.equal(getFilenameFromContentDisposition('attachment; filename="../bad.mp3"', "fallback.mp3"), "fallback.mp3");
});
