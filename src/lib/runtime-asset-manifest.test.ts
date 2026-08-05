import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  matchRuntimeAsset,
  resolveRuntimeAsset,
  validateAssetEntry,
  validateAssetManifest,
  type RuntimeAssetEntry,
} from "./runtime-asset-manifest";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function validEntry(overrides: Partial<RuntimeAssetEntry> = {}): RuntimeAssetEntry {
  return {
    name: "ffmpeg",
    version: "7.1.1-lgpl",
    platform: "darwin",
    architecture: "arm64",
    relativePath: "runtime/darwin-arm64/ffmpeg",
    checksum: digest("ffmpeg-binary"),
    checksumSource: "test-fixture",
    sourceUrl: "https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz",
    license: "LGPL-2.1-or-later",
    capabilities: {
      encodeCodecs: ["libmp3lame"],
      decodeCodecs: ["aac", "h264"],
      containers: ["mp3", "mp4"],
      filters: ["aresample", "volume"],
      protocols: ["concat"],
      subtitleFormats: ["mov_text", "subrip", "srt"],
    },
    buildConfig: {
      upstreamVersion: "ffmpeg-7.1.1",
      configureFlags: ["--enable-lgpl", "--enable-libmp3lame"],
      toolchain: "fixture-toolchain",
      staticLinking: true,
      hasGplComponents: false,
      hasNonfreeComponents: false,
    },
    ...overrides,
  };
}

function validManifest(entries: RuntimeAssetEntry[] = [validEntry()]) {
  return {
    manifestVersion: 1 as const,
    generatedAt: "2026-08-04T00:00:00.000Z",
    generatedFromCommit: "test-fixture",
    releaseChannel: "internal",
    assets: entries,
  };
}

test("accepts a well-formed ffmpeg asset and manifest", () => {
  const entry = validEntry();
  assert.deepEqual(validateAssetEntry(entry), { ok: true });
  const result = validateAssetManifest(validManifest());
  assert.equal(result.ok, true);
});

test("rejects wrong platform, nonfree builds, and missing capability floors", () => {
  const wrongPlatform = validateAssetEntry(validEntry({ platform: "win32" }));
  assert.equal(wrongPlatform.ok, true, "platform is a valid manifest value; runtime matching rejects it");
  const nonfree = validateAssetEntry(validEntry({ buildConfig: { ...validEntry().buildConfig, hasNonfreeComponents: true } }));
  assert.equal(nonfree.ok, false);
  if (!nonfree.ok) assert.match(nonfree.reason, /nonfree/);
  const noMp3 = validateAssetEntry(validEntry({ capabilities: { ...validEntry().capabilities, encodeCodecs: [] } }));
  assert.equal(noMp3.ok, false);
  if (!noMp3.ok) assert.match(noMp3.reason, /libmp3lame/);
});

test("rejects traversal, malformed checksums, and duplicate platform entries", () => {
  const traversal = validateAssetEntry(validEntry({ relativePath: "runtime/../ffmpeg" }));
  assert.equal(traversal.ok, false);
  if (!traversal.ok) assert.match(traversal.reason, /unsafe relativePath/);
  const checksum = validateAssetEntry(validEntry({ checksum: "not-a-sha" }));
  assert.equal(checksum.ok, false);
  if (!checksum.ok) assert.match(checksum.reason, /checksum/);
  const duplicate = validateAssetManifest(validManifest([validEntry(), validEntry()]));
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.match(duplicate.reason, /duplicate/);
});

test("matches by name/platform/architecture and rejects a checksum mismatch", () => {
  const entry = validEntry();
  const match = matchRuntimeAsset([entry], {
    name: "ffmpeg",
    platform: "darwin",
    architecture: "arm64",
    fileSha256: entry.checksum,
  });
  assert.equal(match.ok, true);
  const wrongPlatform = matchRuntimeAsset([entry], {
    name: "ffmpeg",
    platform: "win32",
    architecture: "x64",
  });
  assert.equal(wrongPlatform.ok, false);
  const tampered = matchRuntimeAsset([entry], {
    name: "ffmpeg",
    platform: "darwin",
    architecture: "arm64",
    fileSha256: digest("tampered"),
  });
  assert.equal(tampered.ok, false);
  if (!tampered.ok) assert.match(tampered.reason, /checksum mismatch/);
});

test("resolves a packaged asset only after manifest and file checksum verification", async () => {
  const root = mkdtempSync(path.join(process.cwd(), ".runtime-assets-test-"));
  try {
    const assetPath = path.join(root, "runtime", "darwin-arm64", "ffmpeg");
    const entry = validEntry();
    mkdirSync(path.dirname(assetPath), { recursive: true });
    writeFileSync(assetPath, "ffmpeg-binary", { encoding: "utf8", flag: "w" });
    const manifestPath = path.join(root, "assets.manifest.json");
    writeFileSync(manifestPath, `${JSON.stringify(validManifest([entry]))}\n`, "utf8");
    const resolved = await resolveRuntimeAsset({
      manifestPath,
      resourcesRoot: root,
      name: "ffmpeg",
      platform: "darwin",
      architecture: "arm64",
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) assert.equal(resolved.absolutePath, assetPath);

    writeFileSync(assetPath, "tampered", "utf8");
    const rejected = await resolveRuntimeAsset({
      manifestPath,
      resourcesRoot: root,
      name: "ffmpeg",
      platform: "darwin",
      architecture: "arm64",
    });
    assert.equal(rejected.ok, false);
    if (!rejected.ok) assert.match(rejected.reason, /checksum mismatch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
