import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Versioned contract for binaries that a packaged Desktop build may execute.
 *
 * This module is deliberately independent from Electron and fluent-ffmpeg so
 * it can be used by the packager, readiness checks, and disposable-root tests.
 * A manifest is metadata, not a download mechanism: assets must be supplied by
 * the release pipeline and are verified before they are placed on PATH.
 */
export type AssetName = "ffmpeg" | "ffprobe";
export type AssetPlatform = "darwin" | "win32";
export type AssetArchitecture = "arm64" | "x64";
export type LicenseId = "LGPL-2.1-or-later" | "GPL-3.0-only" | "GPL-2.0-or-later";

export interface AssetCapabilities {
  encodeCodecs: string[];
  decodeCodecs: string[];
  containers: string[];
  filters: string[];
  protocols: string[];
  subtitleFormats: string[];
}

export interface AssetBuildConfig {
  upstreamVersion: string;
  configureFlags: string[];
  toolchain: string;
  staticLinking: boolean;
  hasGplComponents: boolean;
  hasNonfreeComponents: boolean;
}

export interface RuntimeAssetEntry {
  name: AssetName;
  version: string;
  platform: AssetPlatform;
  architecture: AssetArchitecture;
  relativePath: string;
  checksum: string;
  checksumSource: string;
  sourceUrl: string;
  license: LicenseId;
  capabilities: AssetCapabilities;
  buildConfig: AssetBuildConfig;
}

export interface RuntimeAssetManifest {
  manifestVersion: 1;
  generatedAt: string;
  generatedFromCommit: string;
  releaseChannel: string;
  assets: RuntimeAssetEntry[];
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export type ManifestValidationResult =
  | { ok: true; manifest: RuntimeAssetManifest }
  | { ok: false; reason: string };

export type RuntimeMatchResult =
  | { ok: true; entry: RuntimeAssetEntry }
  | { ok: false; reason: string };

export type ResolvedRuntimeAsset =
  | { ok: true; entry: RuntimeAssetEntry; absolutePath: string }
  | { ok: false; reason: string };

const NAMES = new Set<AssetName>(["ffmpeg", "ffprobe"]);
const PLATFORMS = new Set<AssetPlatform>(["darwin", "win32"]);
const ARCHITECTURES = new Set<AssetArchitecture>(["arm64", "x64"]);
const LICENSES = new Set<LicenseId>(["LGPL-2.1-or-later", "GPL-3.0-only", "GPL-2.0-or-later"]);
const SHA256 = /^[0-9a-f]{64}$/;
const REQUIRED_SUBTITLE_FORMATS = new Set(["mov_text", "subrip", "srt"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeRelativePath(value: unknown): value is string {
  if (!nonEmptyString(value)) return false;
  const candidate = value as string;
  if (candidate.startsWith("/") || candidate.includes("\\") || candidate.includes("\0")) return false;
  const segments = candidate.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

/** Validate one entry without touching the filesystem. */
export function validateAssetEntry(input: unknown): ValidationResult {
  if (!isObject(input)) return { ok: false, reason: "entry is not an object" };
  const entry = input;

  if (!NAMES.has(entry.name as AssetName)) return { ok: false, reason: `invalid or missing name: ${String(entry.name)}` };
  if (!nonEmptyString(entry.version)) return { ok: false, reason: "missing required field: version" };
  if (!PLATFORMS.has(entry.platform as AssetPlatform)) return { ok: false, reason: `invalid platform: ${String(entry.platform)}` };
  if (!ARCHITECTURES.has(entry.architecture as AssetArchitecture)) return { ok: false, reason: `invalid architecture: ${String(entry.architecture)}` };
  if (!isSafeRelativePath(entry.relativePath)) return { ok: false, reason: "unsafe relativePath" };
  if (typeof entry.checksum !== "string" || !SHA256.test(entry.checksum)) return { ok: false, reason: "invalid checksum format" };
  if (!nonEmptyString(entry.checksumSource)) return { ok: false, reason: "missing required field: checksumSource" };
  if (!nonEmptyString(entry.sourceUrl)) return { ok: false, reason: "missing required field: sourceUrl" };
  if (!LICENSES.has(entry.license as LicenseId)) return { ok: false, reason: "missing required field: license" };

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
  if (build.hasGplComponents && !String(entry.license).startsWith("GPL-")) {
    return { ok: false, reason: "license/gpl consistency" };
  }

  if (entry.name === "ffmpeg") {
    if (!(entry.capabilities.encodeCodecs as string[]).includes("libmp3lame")) {
      return { ok: false, reason: "missing mandatory encode codec: libmp3lame" };
    }
    const filters = entry.capabilities.filters as string[];
    if (!filters.includes("aresample") || !filters.includes("volume")) {
      return { ok: false, reason: "missing mandatory filter: aresample/volume" };
    }
    if (!(entry.capabilities.protocols as string[]).includes("concat")) {
      return { ok: false, reason: "missing mandatory protocol: concat" };
    }
    if (!(entry.capabilities.subtitleFormats as string[]).some((format) => REQUIRED_SUBTITLE_FORMATS.has(format))) {
      return { ok: false, reason: "missing mandatory subtitle format" };
    }
  }
  return { ok: true };
}

/** Validate the complete manifest envelope and reject duplicate runtime keys. */
export function validateAssetManifest(input: unknown): ManifestValidationResult {
  if (!isObject(input)) return { ok: false, reason: "manifest is not an object" };
  if (input.manifestVersion !== 1) return { ok: false, reason: "unsupported manifestVersion" };
  if (!nonEmptyString(input.generatedAt) || !Number.isFinite(Date.parse(input.generatedAt))) return { ok: false, reason: "invalid generatedAt" };
  if (!nonEmptyString(input.generatedFromCommit)) return { ok: false, reason: "missing generatedFromCommit" };
  if (!nonEmptyString(input.releaseChannel)) return { ok: false, reason: "missing releaseChannel" };
  if (!Array.isArray(input.assets) || input.assets.length === 0) return { ok: false, reason: "manifest assets must be a non-empty array" };

  const seen = new Set<string>();
  for (const entry of input.assets) {
    const result = validateAssetEntry(entry);
    if (!result.ok) return result;
    const typed = entry as RuntimeAssetEntry;
    const key = `${typed.name}:${typed.platform}:${typed.architecture}`;
    if (seen.has(key)) return { ok: false, reason: `duplicate asset: ${key}` };
    seen.add(key);
  }
  return { ok: true, manifest: input as unknown as RuntimeAssetManifest };
}

/** Match one named asset to the current process before checking its bytes. */
export function matchRuntimeAsset(
  entries: RuntimeAssetEntry[],
  context: { name: AssetName; platform: AssetPlatform; architecture: AssetArchitecture; fileSha256?: string },
): RuntimeMatchResult {
  const candidates = entries.filter(
    (entry) => entry.name === context.name && entry.platform === context.platform && entry.architecture === context.architecture,
  );
  if (candidates.length === 0) {
    return { ok: false, reason: `platform mismatch: no ${context.name} asset for ${context.platform}-${context.architecture}` };
  }
  const entry = candidates[0];
  if (context.fileSha256 && entry.checksum !== context.fileSha256) {
    return { ok: false, reason: "checksum mismatch: asset may be corrupt or tampered" };
  }
  return { ok: true, entry };
}

export async function sha256File(filePath: string): Promise<string> {
  const digest = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk: Buffer | string) => digest.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return digest.digest("hex");
}

/** Resolve and verify a named packaged asset under an explicit resources root. */
export async function resolveRuntimeAsset(input: {
  manifestPath: string;
  resourcesRoot: string;
  name: AssetName;
  platform: AssetPlatform;
  architecture: AssetArchitecture;
}): Promise<ResolvedRuntimeAsset> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(input.manifestPath, "utf8"));
  } catch {
    return { ok: false, reason: "runtime asset manifest is unavailable" };
  }
  const manifestResult = validateAssetManifest(parsed);
  if (!manifestResult.ok) return { ok: false, reason: `runtime asset manifest invalid: ${manifestResult.reason}` };
  const match = matchRuntimeAsset(manifestResult.manifest.assets, {
    name: input.name,
    platform: input.platform,
    architecture: input.architecture,
  });
  if (!match.ok) return match;
  const root = path.resolve(input.resourcesRoot);
  const absolutePath = path.resolve(root, ...match.entry.relativePath.split("/"));
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) return { ok: false, reason: "unsafe runtime asset path" };
  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) return { ok: false, reason: "runtime asset is not a file" };
    await access(absolutePath);
    const actual = await sha256File(absolutePath);
    const verified = matchRuntimeAsset(manifestResult.manifest.assets, {
      name: input.name,
      platform: input.platform,
      architecture: input.architecture,
      fileSha256: actual,
    });
    if (!verified.ok) return verified;
  } catch {
    return { ok: false, reason: "runtime asset is missing or unreadable" };
  }
  return { ok: true, entry: match.entry, absolutePath };
}
