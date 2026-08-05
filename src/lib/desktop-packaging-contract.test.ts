import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const source = readFileSync(path.join(process.cwd(), "scripts", "desktop-package.mjs"), "utf8");
const preflightSource = readFileSync(path.join(process.cwd(), "scripts", "desktop-preflight.mjs"), "utf8");

test("Desktop packager selects a platform/architecture-specific Prisma engine", () => {
  assert.match(source, /DEEPLISTENER_TARGET_PLATFORM/);
  assert.match(source, /DEEPLISTENER_TARGET_ARCH/);
  assert.match(source, /darwin-arm64/);
  assert.match(source, /darwin-x64/);
  assert.match(source, /win32-x64/);
  assert.match(source, /unsupported Desktop runtime target/);
  assert.match(source, /prismaEnginePath/);
});

test("Desktop packager emits a checksum-bound runtime asset manifest only with metadata", () => {
  assert.match(source, /assets\.manifest\.json/);
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /metadata is missing; refusing to emit/);
  assert.match(source, /runtime\/\$\{runtimeTarget\}/);
});

test("Desktop preflight explains a missing system FFmpeg alpha escape hatch", () => {
  assert.match(preflightSource, /const systemFfmpegReady = allowSystemFfmpeg/);
  assert.match(preflightSource, /Internal alpha requested system FFmpeg/);
  assert.match(preflightSource, /not available on PATH/);
  assert.match(preflightSource, /redistributable vendor assets/);
});

test("public preflight blocks the current synthetic Demo fixture", () => {
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

  assert.notEqual(result.status, 0, "public preflight must fail for the current fixture");
  assert.match(output, /bundled demo is still synthetic or has incomplete provenance/i);
  assert.match(output, /redistributable vendor\/ffmpeg\/contract-test-contract-test/i);
});
