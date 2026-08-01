import test from "node:test";
import assert from "node:assert/strict";
import { toSafeHeaderFilename } from "./header-filename";

test("toSafeHeaderFilename passes through plain text unchanged", () => {
  assert.equal(toSafeHeaderFilename("podcast-ep1"), "podcast-ep1");
  assert.equal(toSafeHeaderFilename("Chapter 1 Notes"), "Chapter 1 Notes");
});

test("toSafeHeaderFilename strips header-breaking characters (quote, backslash, CRLF)", () => {
  // A quote would terminate the filename token early; CR/LF enables header splitting.
  assert.equal(toSafeHeaderFilename('evil"quote'), "evil-quote");
  assert.equal(toSafeHeaderFilename("back\\slash"), "back-slash");
  assert.equal(toSafeHeaderFilename("line1\r\nline2"), "line1-line2");
});

test("toSafeHeaderFilename rejects path separators and shell metacharacters", () => {
  // Path separators (/) are collapsed; dots are harmless in a header token
  // (no client interprets Content-Disposition as a filesystem path), so they
  // are preserved. A leading "../" therefore tidies down to a clean prefix.
  assert.equal(toSafeHeaderFilename("../etc/passwd"), "..etc-passwd");
  assert.equal(toSafeHeaderFilename("a/b/c"), "a-b-c");
  assert.equal(toSafeHeaderFilename("file<>|:*?.txt"), "file.txt");
});

test("toSafeHeaderFilename collapses runs of replaced chars and trims edges", () => {
  assert.equal(toSafeHeaderFilename("---start"), "start");
  assert.equal(toSafeHeaderFilename("end---"), "end");
  assert.equal(toSafeHeaderFilename("a///b"), "a-b");
});

test("toSafeHeaderFilename falls back when input collapses to empty", () => {
  assert.equal(toSafeHeaderFilename('""""'), "export");
  assert.equal(toSafeHeaderFilename("\r\n\r\n"), "export");
  assert.equal(toSafeHeaderFilename('""""', "notes"), "notes");
});

test("toSafeHeaderFilename strips control characters (0x00-0x1f)", () => {
  assert.equal(toSafeHeaderFilename("clean\x00\x1fend"), "clean-end");
});
