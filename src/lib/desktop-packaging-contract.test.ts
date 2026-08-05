import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

// Note: this file previously held several readFileSync + assert.match tests
// that pinned specific regex fragments against the packager/preflight source
// text. Those were source-coupling tautologies — they broke on any reformat or
// rename while asserting nothing about runtime behavior — and have been
// removed. Only the behavioral test below, which actually executes the
// preflight script, is retained.

test("public preflight still fails closed when vendor FFmpeg assets are missing", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(process.cwd(), "scripts", "desktop-preflight.mjs")],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        // Force a disposable target so a developer machine's vendor directory
        // cannot accidentally make this release-gate test pass.
        DEEPLISTENER_TARGET_PLATFORM: "contract-test",
        DEEPLISTENER_TARGET_ARCH: "contract-test",
      },
    },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  assert.notEqual(result.status, 0, "public preflight must fail without target assets");
  assert.doesNotMatch(output, /bundled demo is still synthetic or has incomplete provenance/i);
  assert.match(output, /redistributable vendor\/ffmpeg\/contract-test-contract-test/i);
});
