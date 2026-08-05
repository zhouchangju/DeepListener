"use strict";

/**
 * Runtime side of the versioned Desktop asset contract.
 *
 * The TypeScript validator in src/lib/runtime-asset-manifest.ts is used by
 * the server/packager tests. Electron cannot require TypeScript from a
 * packaged app, so this small CommonJS adapter mirrors the same structural and
 * semantic checks at the process boundary before FFmpeg is executed.
 */
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const NAMES = new Set(["ffmpeg", "ffprobe"]);
const PLATFORMS = new Set(["darwin", "win32"]);
const ARCHITECTURES = new Set(["arm64", "x64"]);
const LICENSES = new Set(["LGPL-2.1-or-later", "GPL-3.0-only", "GPL-2.0-or-later"]);
const SHA256 = /^[0-9a-f]{64}$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeRelativePath(value) {
  if (!nonEmptyString(value) || value.startsWith("/") || value.includes("\\") || value.includes("\0")) return false;
  return value.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

function validateAssetEntry(entry) {
  if (!isObject(entry)) return { ok: false, reason: "entry is not an object" };
  if (!NAMES.has(entry.name)) return { ok: false, reason: `invalid or missing name: ${String(entry.name)}` };
  if (!nonEmptyString(entry.version)) return { ok: false, reason: "missing required field: version" };
  if (!PLATFORMS.has(entry.platform)) return { ok: false, reason: `invalid platform: ${String(entry.platform)}` };
  if (!ARCHITECTURES.has(entry.architecture)) return { ok: false, reason: `invalid architecture: ${String(entry.architecture)}` };
  if (!isSafeRelativePath(entry.relativePath)) return { ok: false, reason: "unsafe relativePath" };
  if (typeof entry.checksum !== "string" || !SHA256.test(entry.checksum)) return { ok: false, reason: "invalid checksum format" };
  if (!nonEmptyString(entry.checksumSource)) return { ok: false, reason: "missing required field: checksumSource" };
  if (!nonEmptyString(entry.sourceUrl)) return { ok: false, reason: "missing required field: sourceUrl" };
  if (!LICENSES.has(entry.license)) return { ok: false, reason: "missing required field: license" };
  if (!isObject(entry.capabilities)) return { ok: false, reason: "missing required field: capabilities" };
  for (const key of ["encodeCodecs", "decodeCodecs", "containers", "filters", "protocols", "subtitleFormats"]) {
    if (!isStringArray(entry.capabilities[key])) return { ok: false, reason: `capabilities.${key} must be a string array` };
  }
  if (!isObject(entry.buildConfig)) return { ok: false, reason: "missing required field: buildConfig" };
  const build = entry.buildConfig;
  if (!nonEmptyString(build.upstreamVersion)) return { ok: false, reason: "missing required field: buildConfig.upstreamVersion" };
  if (!isStringArray(build.configureFlags)) return { ok: false, reason: "buildConfig.configureFlags must be a string array" };
  if (!nonEmptyString(build.toolchain)) return { ok: false, reason: "missing required field: buildConfig.toolchain" };
  for (const key of ["staticLinking", "hasGplComponents", "hasNonfreeComponents"]) {
    if (typeof build[key] !== "boolean") return { ok: false, reason: `missing required field: buildConfig.${key}` };
  }
  if (build.hasNonfreeComponents) return { ok: false, reason: "nonfree components are not redistributable" };
  if (build.hasGplComponents && !String(entry.license).startsWith("GPL-")) return { ok: false, reason: "license/gpl consistency" };
  if (entry.name === "ffmpeg") {
    if (!entry.capabilities.encodeCodecs.includes("libmp3lame")) return { ok: false, reason: "missing mandatory encode codec: libmp3lame" };
    if (!entry.capabilities.filters.includes("aresample") || !entry.capabilities.filters.includes("volume")) return { ok: false, reason: "missing mandatory filter: aresample/volume" };
    if (!entry.capabilities.protocols.includes("concat")) return { ok: false, reason: "missing mandatory protocol: concat" };
    if (!entry.capabilities.subtitleFormats.some((format) => ["mov_text", "subrip", "srt"].includes(format))) return { ok: false, reason: "missing mandatory subtitle format" };
  }
  return { ok: true };
}

function validateManifest(manifest) {
  if (!isObject(manifest)) return { ok: false, reason: "manifest is not an object" };
  if (manifest.manifestVersion !== 1) return { ok: false, reason: "unsupported manifestVersion" };
  if (!nonEmptyString(manifest.generatedAt) || !Number.isFinite(Date.parse(manifest.generatedAt))) return { ok: false, reason: "invalid generatedAt" };
  if (!nonEmptyString(manifest.generatedFromCommit)) return { ok: false, reason: "missing generatedFromCommit" };
  if (!nonEmptyString(manifest.releaseChannel)) return { ok: false, reason: "missing releaseChannel" };
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) return { ok: false, reason: "manifest assets must be a non-empty array" };
  const seen = new Set();
  for (const entry of manifest.assets) {
    const result = validateAssetEntry(entry);
    if (!result.ok) return result;
    const key = `${entry.name}:${entry.platform}:${entry.architecture}`;
    if (seen.has(key)) return { ok: false, reason: `duplicate asset: ${key}` };
    seen.add(key);
  }
  return { ok: true, manifest };
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function resolveEntry(resourcesRoot, manifest, name, platform, architecture) {
  const entry = manifest.assets.find((candidate) => candidate.name === name && candidate.platform === platform && candidate.architecture === architecture);
  if (!entry) return { ok: false, reason: `platform mismatch: no ${name} asset for ${platform}-${architecture}` };
  const root = path.resolve(resourcesRoot);
  const absolutePath = path.resolve(root, ...entry.relativePath.split("/"));
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) return { ok: false, reason: "unsafe runtime asset path" };
  try {
    if (!fs.statSync(absolutePath).isFile()) return { ok: false, reason: "runtime asset is not a file" };
    if (sha256File(absolutePath) !== entry.checksum) return { ok: false, reason: "checksum mismatch: asset may be corrupt or tampered" };
  } catch {
    return { ok: false, reason: "runtime asset is missing or unreadable" };
  }
  return { ok: true, entry, absolutePath };
}

/** Resolve both binaries from a validated manifest; partial pairs are rejected. */
function resolvePackagedRuntimeAssets({ resourcesRoot, manifestPath, platform = process.platform, architecture = process.arch }) {
  if (!PLATFORMS.has(platform) || !ARCHITECTURES.has(architecture)) {
    return { ok: false, reason: `unsupported Desktop runtime: ${platform}-${architecture}` };
  }
  const candidates = [
    manifestPath,
    path.join(resourcesRoot, "runtime", "assets.manifest.json"),
    path.join(resourcesRoot, "assets.manifest.json"),
  ].filter(Boolean);
  let parsed;
  let selectedPath;
  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      selectedPath = candidate;
      break;
    } catch {
      // Try the next packaging layout; all failures become one safe reason.
    }
  }
  if (!parsed) return { ok: false, reason: "runtime asset manifest is unavailable" };
  const manifestResult = validateManifest(parsed);
  if (!manifestResult.ok) return { ok: false, reason: `runtime asset manifest invalid: ${manifestResult.reason}` };
  const root = path.dirname(selectedPath).endsWith(`${path.sep}runtime`)
    ? path.dirname(path.dirname(selectedPath))
    : path.dirname(selectedPath);
  const ffmpeg = resolveEntry(root, manifestResult.manifest, "ffmpeg", platform, architecture);
  if (!ffmpeg.ok) return ffmpeg;
  const ffprobe = resolveEntry(root, manifestResult.manifest, "ffprobe", platform, architecture);
  if (!ffprobe.ok) return ffprobe;
  return {
    ok: true,
    manifestPath: selectedPath,
    manifest: manifestResult.manifest,
    ffmpegPath: ffmpeg.absolutePath,
    ffprobePath: ffprobe.absolutePath,
    entries: { ffmpeg: ffmpeg.entry, ffprobe: ffprobe.entry },
  };
}

module.exports = {
  validateAssetEntry,
  validateManifest,
  resolvePackagedRuntimeAssets,
};
