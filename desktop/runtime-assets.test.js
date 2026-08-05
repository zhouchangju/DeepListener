"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  resolveAlphaSystemRuntimeAssets,
  resolvePackagedRuntimeAssets,
  validateAssetEntry,
} = require("./runtime-assets.js");

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function entry(name, platform, architecture, relativePath, bytes) {
  return {
    name,
    version: "7.1.1-lgpl",
    platform,
    architecture,
    relativePath,
    checksum: hash(bytes),
    checksumSource: "test-fixture",
    sourceUrl: "https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz",
    license: "LGPL-2.1-or-later",
    capabilities: {
      encodeCodecs: name === "ffmpeg" ? ["libmp3lame"] : [],
      decodeCodecs: [],
      containers: [],
      filters: name === "ffmpeg" ? ["aresample", "volume"] : [],
      protocols: name === "ffmpeg" ? ["concat"] : [],
      subtitleFormats: name === "ffmpeg" ? ["srt"] : [],
    },
    buildConfig: {
      upstreamVersion: "ffmpeg-7.1.1",
      configureFlags: ["--enable-lgpl"],
      toolchain: "test-toolchain",
      staticLinking: true,
      hasGplComponents: false,
      hasNonfreeComponents: false,
    },
  };
}

function manifest(entries) {
  return {
    manifestVersion: 1,
    generatedAt: "2026-08-04T00:00:00.000Z",
    generatedFromCommit: "test-fixture",
    releaseChannel: "internal",
    assets: entries,
  };
}

test("runtime asset adapter accepts a verified pair and returns explicit paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deeplistener-runtime-assets-"));
  try {
    const ffmpegBytes = "ffmpeg-fixture";
    const ffprobeBytes = "ffprobe-fixture";
    const ffmpegPath = path.join(root, "runtime", "darwin-arm64", "ffmpeg");
    const ffprobePath = path.join(root, "runtime", "darwin-arm64", "ffprobe");
    fs.mkdirSync(path.dirname(ffmpegPath), { recursive: true });
    fs.writeFileSync(ffmpegPath, ffmpegBytes);
    fs.writeFileSync(ffprobePath, ffprobeBytes);
    fs.writeFileSync(path.join(root, "runtime", "assets.manifest.json"), JSON.stringify(manifest([
      entry("ffmpeg", "darwin", "arm64", "runtime/darwin-arm64/ffmpeg", ffmpegBytes),
      entry("ffprobe", "darwin", "arm64", "runtime/darwin-arm64/ffprobe", ffprobeBytes),
    ])));
    const resolved = resolvePackagedRuntimeAssets({ resourcesRoot: root, platform: "darwin", architecture: "arm64" });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.ffmpegPath, ffmpegPath);
      assert.equal(resolved.ffprobePath, ffprobePath);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runtime asset adapter rejects tampering, wrong platform, and nonfree metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deeplistener-runtime-assets-"));
  try {
    const ffmpegBytes = "ffmpeg-fixture";
    const ffprobeBytes = "ffprobe-fixture";
    const ffmpegPath = path.join(root, "runtime", "darwin-arm64", "ffmpeg");
    const ffprobePath = path.join(root, "runtime", "darwin-arm64", "ffprobe");
    fs.mkdirSync(path.dirname(ffmpegPath), { recursive: true });
    fs.writeFileSync(ffmpegPath, "tampered");
    fs.writeFileSync(ffprobePath, ffprobeBytes);
    fs.writeFileSync(path.join(root, "runtime", "assets.manifest.json"), JSON.stringify(manifest([
      entry("ffmpeg", "darwin", "arm64", "runtime/darwin-arm64/ffmpeg", ffmpegBytes),
      entry("ffprobe", "darwin", "arm64", "runtime/darwin-arm64/ffprobe", ffprobeBytes),
    ])));
    const tampered = resolvePackagedRuntimeAssets({ resourcesRoot: root, platform: "darwin", architecture: "arm64" });
    assert.equal(tampered.ok, false);
    if (!tampered.ok) assert.match(tampered.reason, /checksum mismatch/);

    const wrongPlatform = validateAssetEntry(entry("ffmpeg", "win32", "x64", "runtime/win32-x64/ffmpeg", ffmpegBytes));
    assert.equal(wrongPlatform.ok, true, "win32-x64 is valid metadata; matching is runtime-specific");
    const nonfree = validateAssetEntry({ ...entry("ffmpeg", "darwin", "arm64", "runtime/darwin-arm64/ffmpeg", ffmpegBytes), buildConfig: { ...entry("ffmpeg", "darwin", "arm64", "runtime/darwin-arm64/ffmpeg", ffmpegBytes).buildConfig, hasNonfreeComponents: true } });
    assert.equal(nonfree.ok, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("internal Alpha resolves a complete executable Homebrew FFmpeg pair", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deeplistener-system-ffmpeg-"));
  try {
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    const ffmpegPath = path.join(bin, "ffmpeg");
    const ffprobePath = path.join(bin, "ffprobe");
    const ffmpegFixture = `#!/bin/sh
case "$*" in
  *-version*) echo "ffmpeg version test" ;;
  *-encoders*) echo "libmp3lame" ;;
  *-filters*) echo "aresample volume" ;;
  *-protocols*) echo "concat" ;;
  *-formats*) echo "srt" ;;
esac
`;
    fs.writeFileSync(ffmpegPath, ffmpegFixture);
    fs.writeFileSync(ffprobePath, "#!/bin/sh\necho 'ffprobe version test'\n");
    fs.chmodSync(ffmpegPath, 0o755);
    fs.chmodSync(ffprobePath, 0o755);
    fs.writeFileSync(path.join(root, "runtime-manifest.json"), JSON.stringify({
      schemaVersion: 1,
      releaseChannel: "internal-alpha",
      platform: "darwin",
      architecture: "arm64",
      build: { systemFfmpegFallback: true },
    }));

    const resolved = resolveAlphaSystemRuntimeAssets({
      resourcesRoot: root,
      platform: "darwin",
      architecture: "arm64",
      candidateDirs: [bin],
    });

    assert.deepEqual(resolved, { ok: true, ffmpegPath, ffprobePath });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("internal Alpha rejects executable files that are not a usable FFmpeg pair", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deeplistener-system-ffmpeg-"));
  try {
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    for (const name of ["ffmpeg", "ffprobe"]) {
      const binary = path.join(bin, name);
      fs.writeFileSync(binary, "not a command");
      fs.chmodSync(binary, 0o755);
    }
    fs.writeFileSync(path.join(root, "runtime-manifest.json"), JSON.stringify({
      schemaVersion: 1,
      releaseChannel: "internal-alpha",
      platform: "darwin",
      architecture: "arm64",
      build: { systemFfmpegFallback: true },
    }));

    const resolved = resolveAlphaSystemRuntimeAssets({
      resourcesRoot: root,
      platform: "darwin",
      architecture: "arm64",
      candidateDirs: [bin],
    });

    assert.equal(resolved.ok, false);
    if (!resolved.ok) assert.match(resolved.reason, /unavailable|capability/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("system FFmpeg remains disabled without the internal Alpha package marker", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deeplistener-system-ffmpeg-"));
  try {
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    for (const name of ["ffmpeg", "ffprobe"]) {
      const binary = path.join(bin, name);
      fs.writeFileSync(binary, "fixture");
      fs.chmodSync(binary, 0o755);
    }
    fs.writeFileSync(path.join(root, "runtime-manifest.json"), JSON.stringify({
      schemaVersion: 1,
      releaseChannel: "public",
      platform: "darwin",
      architecture: "arm64",
      build: { systemFfmpegFallback: true },
    }));

    const resolved = resolveAlphaSystemRuntimeAssets({
      resourcesRoot: root,
      platform: "darwin",
      architecture: "arm64",
      candidateDirs: [bin],
    });

    assert.equal(resolved.ok, false);
    if (!resolved.ok) assert.match(resolved.reason, /not enabled/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
