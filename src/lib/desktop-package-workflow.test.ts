import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const workflow = readFileSync(path.join(process.cwd(), ".github", "workflows", "desktop-package.yml"), "utf8");
const audit = readFileSync(path.join(process.cwd(), "scripts", "desktop-package-audit.mjs"), "utf8");
const dist = readFileSync(path.join(process.cwd(), "scripts", "desktop-dist.mjs"), "utf8");
const packager = readFileSync(path.join(process.cwd(), "scripts", "desktop-package.mjs"), "utf8");
const preflight = readFileSync(path.join(process.cwd(), "scripts", "desktop-preflight.mjs"), "utf8");

test("desktop package workflow covers macOS arm64 and Windows x64 without publishing", () => {
  assert.match(workflow, /macos-14/);
  assert.match(workflow, /platform: darwin/);
  assert.match(workflow, /architecture: arm64/);
  assert.match(workflow, /windows-latest/);
  assert.match(workflow, /platform: win32/);
  assert.match(workflow, /architecture: x64/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npx prisma generate/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /desktop-package\.mjs --no-build/);
  assert.match(workflow, /desktop-package-audit\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /retention-days: 7/);
  assert.doesNotMatch(workflow, /electron-builder|publish:|notarize|CSC_LINK|APPLE_ID/i);
});

test("desktop package audit is fail-closed for user data and malformed manifests", () => {
  assert.match(audit, /forbidden user-data asset present/);
  assert.match(audit, /settings\/secrets\.json/);
  assert.match(audit, /runtime-manifest\.json/);
  assert.match(audit, /user media copied/);
  assert.match(audit, /process\.exit\(1\)/);
});

test("only an explicit Alpha distribution records system FFmpeg fallback permission", () => {
  assert.match(dist, /DEEPLISTENER_ALLOW_SYSTEM_FFMPEG/);
  assert.match(dist, /DEEPLISTENER_RELEASE_CHANNEL/);
  assert.match(packager, /systemFfmpegFallback/);
  assert.match(packager, /releaseChannel/);
  assert.match(dist, /validateReusedStandalone/);
  assert.match(preflight, /resolveSystemRuntimePair/);
  assert.doesNotMatch(preflight, /spawnSync\(command/);
});
