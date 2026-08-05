# T023 — Runtime Asset Manifest Schema

| Field | Value |
|---|---|
| Sprint | SPR-001 (W0 Desktop Feasibility, Adversarial) |
| Lane | W0-B |
| Task | T023 — Define runtime asset manifest schema + validator test |
| Req | FR-073, DRD-003 (reproducible release manifest), FR-041 (packaged media tools) |
| Baseline commit | `960ec85` |
| Date | 2026-07-22 |
| Scope | Implemented contract: the schema/validator lives in `src/lib/runtime-asset-manifest.ts`, with a CommonJS Electron boundary adapter in `desktop/runtime-assets.js`; this document remains the normative field and acceptance reference. |

## 1. Purpose

Desktop must invoke verified packaged FFmpeg/ffprobe assets selected by platform and
architecture, with no PATH fallback (FR-041, DMR-002), and every release artifact must be
traceable to a tagged commit with version/platform/arch/checksums/runtime-asset versions
(FR-073, DRD-003). This document defines the **runtime asset manifest** that pins each
binary the desktop app will exec: its identity, provenance, checksum, license, capabilities,
and build configuration. It is the data contract consumed by the runtime asset resolver
(W1-C T082) and the release package-content gate (W2-E T151 / W3-B T181).

## 2. Top-Level Manifest Envelope

A manifest file (e.g. `runtime/assets.manifest.json`, emitted into the packaged app) is a
JSON object containing a schema version and an array of asset entries. Each entry describes
one binary for one `(platform, architecture)` pair. Multiple entries cover multi-platform
release builds.

```jsonc
{
  "$schema": "https://example.internal/desktop/runtime-asset-manifest.v1.json",
  "manifestVersion": 1,
  "generatedAt": "2026-07-22T00:00:00Z",
  "generatedFromCommit": "960ec85",
  "releaseChannel": "beta",
  "assets": [ /* AssetEntry, ... */ ]
}
```

## 3. AssetEntry Schema (TypeScript)

```ts
// src/lib/runtime-asset-manifest.ts (implemented)

export type AssetName = "ffmpeg" | "ffprobe";
export type Platform = "darwin" | "win32"; // Node process.platform values
export type Architecture = "arm64" | "x64"; // Node process.arch values
export type LicenseId =
  | "LGPL-2.1-or-later"
  | "GPL-3.0-only"
  | "GPL-2.0-or-later";

/** Hex sha256 digest, lowercase, 64 chars. */
export type Sha256 = string;

export interface AssetCapabilities {
  /** Codecs the binary can ENCODE, by ffmpeg codec name (e.g. "libmp3lame", "aac"). */
  encodeCodecs: string[];
  /** Codecs the binary can DECODE (e.g. "h264", "aac", "vp9", "opus", "flac"). */
  decodeCodecs: string[];
  /** Containers/demuxers + muxers supported (e.g. "mp4", "webm", "mp3", "srt"). */
  containers: string[];
  /** FFmpeg filters required by the app (e.g. "aresample", "volume"). */
  filters: string[];
  /** Protocols/demuxers required (e.g. "concat"). */
  protocols: string[];
  /** Subtitle codecs/formats handled (e.g. "mov_text", "subrip", "srt"). */
  subtitleFormats: string[];
}

export interface BuildConfig {
  /** Upstream source version the binary was built from (e.g. "ffmpeg-7.1.1"). */
  upstreamVersion: string;
  /** Full ./configure flags, so the build is reproducible (NFR-052). */
  configureFlags: string[];
  /** Toolchain used (e.g. "Apple clang 17.0.0"). */
  toolchain: string;
  /** Whether the binary is statically linked (affects LGPL swap boundary). */
  staticLinking: boolean;
  /** Whether any GPL/nonfree component is enabled. If true, license MUST be GPL-*. */
  hasGplComponents: boolean;
  /** Whether any --enable-nonfree component is enabled. DeepListener REJECTS nonfree. */
  hasNonfreeComponents: boolean;
}

export interface AssetEntry {
  /** What this binary is. */
  name: AssetName;
  /** Semantic version of the binary (independent of app version). */
  version: string;
  /** Target OS. Must equal process.platform at runtime. */
  platform: Platform;
  /** Target CPU arch. Must equal process.arch at runtime. */
  architecture: Architecture;
  /** Path relative to the packaged app resources root (POSIX separators, no ".."). */
  relativePath: string;
  /** sha256 of the file at relativePath, verified before exec. */
  checksum: Sha256;
  /** Where the checksum was obtained/verified (e.g. "release-pipeline", "upstream-asc"). */
  checksumSource: string;
  /** Canonical URL the binary was sourced from (for audit; not fetched at runtime). */
  sourceUrl: string;
  /** SPDX-ish license id of THIS BUILD. */
  license: LicenseId;
  /** What the binary can do, checked against app requirements (T020). */
  capabilities: AssetCapabilities;
  /** Reproducible build metadata. */
  buildConfig: BuildConfig;
}
```

## 4. Field Rules & Acceptance/Rejection Logic

The validator (`validateAssetEntry`) enforces both structural rules and semantic invariants.
Rules are ordered so the rejection reason is specific.

### 4.1 Required / type rules
- `name` ∈ `{"ffmpeg","ffprobe"}`.
- `version` is a non-empty string.
- `platform` ∈ `{"darwin","win32"}`.
- `architecture` ∈ `{"arm64","x64"}`.
- `relativePath` is a non-empty string, uses `/` separators, has no `..` segments, and is
  not absolute (defense in depth against path traversal into/under the app bundle).
- `checksum` matches `/^[0-9a-f]{64}$/` (lowercase sha256).
- `checksumSource`, `sourceUrl` non-empty strings.
- `license` ∈ the SPDX set above.
- `capabilities` present with all six arrays (may be empty arrays, but the keys must exist).
- `buildConfig` present with all six fields; `upstreamVersion`, `toolchain` non-empty.

### 4.2 Semantic invariants (release-blocking)
- **License/consistency:** if `buildConfig.hasGplComponents === true`, then `license` MUST be
  a `GPL-*` value. If `hasNonfreeComponents === true`, the entry is **REJECTED** outright
  (DeepListener never ships nonfree).
- **LGPL default:** DeepListener's target posture is LGPL. An entry whose `license` is
  `GPL-*` is accepted structurally but flagged for the T050 gate; it must not be silently
  adopted.
- **Capability floor:** if `name === "ffmpeg"`, `capabilities.encodeCodecs` MUST include
  `"libmp3lame"` (T020 mandatory), `capabilities.filters` MUST include `"aresample"` and
  `"volume"`, and `capabilities.protocols` MUST include `"concat"`. If `name === "ffprobe"`,
  `capabilities` is informational only (probe does not transcode) but must still be present.
- **Subtitle floor (ffmpeg):** `capabilities.subtitleFormats` MUST include at least one of
  `"mov_text"` / `"subrip"` / `"srt"` (FR-046 embedded-subtitle preference).

### 4.3 Acceptance rule
An `AssetEntry` is **accepted** iff every rule in §4.1 and §4.2 passes, AND (when used at
runtime) its `(platform, architecture)` matches the running process AND `sha256(file at
relativePath) === checksum`.

### 4.4 Rejection rules (canonical cases)
| Case | Rejected by | Reason string |
|---|---|---|
| wrong platform (e.g. `win32` on a darwin machine) | runtime matcher | `"platform mismatch: expected darwin, got win32"` |
| wrong arch (e.g. `x64` on arm64) | runtime matcher | `"architecture mismatch"` |
| checksum mismatch (file sha ≠ manifest) | checksum guard | `"checksum mismatch: asset may be corrupt or tampered"` |
| missing metadata field (e.g. no `license`) | structural validator | `"missing required field: license"` |
| malformed checksum (not 64-hex) | structural validator | `"invalid checksum format"` |
| `hasNonfreeComponents === true` | semantic validator | `"nonfree components are not redistributable"` |
| GPL build but `license` says LGPL | semantic validator | `"license/gpl consistency"` |
| ffmpeg missing `libmp3lame` | capability floor | `"missing mandatory encode codec: libmp3lame"` |
| ffmpeg missing `concat` protocol | capability floor | `"missing mandatory protocol: concat"` |
| `relativePath` contains `..` or is absolute | path guard | `"unsafe relativePath"` |

## 5. Example Accepted Entry (darwin-arm64, LGPL — the T021 recommended shape)

```json
{
  "name": "ffmpeg",
  "version": "7.1.1-lgpl",
  "platform": "darwin",
  "architecture": "arm64",
  "relativePath": "runtime/darwin-arm64/ffmpeg",
  "checksum": "fd670257233c93c88608a62ed8b5ddeeb812bd341dfb39bbe0e1c654b91672ad",
  "checksumSource": "release-pipeline:desktop-arm64-2026-07-22",
  "sourceUrl": "https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz",
  "license": "LGPL-2.1-or-later",
  "capabilities": {
    "encodeCodecs": ["libmp3lame"],
    "decodeCodecs": ["h264", "aac", "vp8", "vp9", "opus", "vorbis", "flac", "pcm_s16le"],
    "containers": ["mp4", "webm", "mp3", "srt"],
    "filters": ["aresample", "volume"],
    "protocols": ["concat"],
    "subtitleFormats": ["mov_text", "subrip", "srt"]
  },
  "buildConfig": {
    "upstreamVersion": "ffmpeg-7.1.1",
    "configureFlags": [
      "--enable-lgpl", "--enable-version3", "--enable-libmp3lame",
      "--disable-gpl", "--disable-nonfree", "--enable-static", "--disable-shared",
      "--enable-pthreads", "--enable-audiotoolbox", "--enable-videotoolbox"
    ],
    "toolchain": "Apple clang 17.0.0 (darwin-arm64)",
    "staticLinking": true,
    "hasGplComponents": false,
    "hasNonfreeComponents": false
  }
}
```

## 6. Validator Test (embedded code block — run with `node --import tsx --test`)

This is the normative contract test outline. The executable tests now live in
`src/lib/runtime-asset-manifest.test.ts` and `desktop/runtime-assets.test.js`. They assert:
(a) a valid darwin-arm64 entry is accepted, and (b) wrong-platform,
checksum-mismatch, missing-metadata, nonfree, capability-floor, and path-traversal entries
are rejected with specific reasons.

```ts
// runtime-asset-manifest.test.ts (contract excerpt; executable file is in src/lib/)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateAssetEntry,
  matchRuntimeAsset,
  type AssetEntry,
} from "./runtime-asset-manifest.js";

const validDarwinArm64Ffmpeg: AssetEntry = {
  name: "ffmpeg",
  version: "7.1.1-lgpl",
  platform: "darwin",
  architecture: "arm64",
  relativePath: "runtime/darwin-arm64/ffmpeg",
  checksum: "fd670257233c93c88608a62ed8b5ddeeb812bd341dfb39bbe0e1c654b91672ad",
  checksumSource: "release-pipeline:desktop-arm64-2026-07-22",
  sourceUrl: "https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz",
  license: "LGPL-2.1-or-later",
  capabilities: {
    encodeCodecs: ["libmp3lame"],
    decodeCodecs: ["h264", "aac", "opus"],
    containers: ["mp4", "webm", "mp3", "srt"],
    filters: ["aresample", "volume"],
    protocols: ["concat"],
    subtitleFormats: ["mov_text", "subrip", "srt"],
  },
  buildConfig: {
    upstreamVersion: "ffmpeg-7.1.1",
    configureFlags: ["--enable-lgpl", "--enable-libmp3lame", "--disable-gpl", "--disable-nonfree"],
    toolchain: "Apple clang 17.0.0 (darwin-arm64)",
    staticLinking: true,
    hasGplComponents: false,
    hasNonfreeComponents: false,
  },
};

test("AC-T023: schema ACCEPTS a well-formed darwin-arm64 ffmpeg asset", () => {
  const result = validateAssetEntry(validDarwinArm64Ffmpeg);
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
});

test("AC-T023: schema REJECTS a wrong-platform entry (win32 on darwin runtime)", () => {
  const wrongPlatform: AssetEntry = { ...validDarwinArm64Ffmpeg, platform: "win32" };
  // structurally valid...
  assert.equal(validateAssetEntry(wrongPlatform).ok, true);
  // ...but rejected by the runtime matcher when running on darwin:
  const match = matchRuntimeAsset([wrongPlatform], {
    platform: "darwin",
    architecture: "arm64",
    fileSha256: validDarwinArm64Ffmpeg.checksum,
  });
  assert.equal(match.ok, false);
  assert.match(match.reason, /platform mismatch/i);
});

test("AC-T023: schema REJECTS a checksum-mismatch entry at runtime", () => {
  const match = matchRuntimeAsset([validDarwinArm64Ffmpeg], {
    platform: "darwin",
    architecture: "arm64",
    fileSha256: "0".repeat(64), // tampered/corrupt bytes on disk
  });
  assert.equal(match.ok, false);
  assert.match(match.reason, /checksum mismatch/i);
});

test("AC-T023: schema REJECTS missing-metadata entry (no license)", () => {
  const missingLicense = { ...validDarwinArm64Ffmpeg } as Partial<AssetEntry>;
  delete missingLicense.license;
  const result = validateAssetEntry(missingLicense as AssetEntry);
  assert.equal(result.ok, false);
  assert.match(result.reason, /missing required field: license/i);
});

test("AC-T023: schema REJECTS nonfree build posture", () => {
  const nonfree: AssetEntry = {
    ...validDarwinArm64Ffmpeg,
    buildConfig: { ...validDarwinArm64Ffmpeg.buildConfig, hasNonfreeComponents: true },
  };
  const result = validateAssetEntry(nonfree);
  assert.equal(result.ok, false);
  assert.match(result.reason, /nonfree/i);
});

test("AC-T023: schema REJECTS ffmpeg missing mandatory libmp3lame encode codec", () => {
  const noMp3: AssetEntry = {
    ...validDarwinArm64Ffmpeg,
    capabilities: { ...validDarwinArm64Ffmpeg.capabilities, encodeCodecs: ["aac"] },
  };
  const result = validateAssetEntry(noMp3);
  assert.equal(result.ok, false);
  assert.match(result.reason, /libmp3lame/i);
});

test("AC-T023: schema REJECTS unsafe relativePath containing '..'", () => {
  const traversal: AssetEntry = { ...validDarwinArm64Ffmpeg, relativePath: "runtime/../ffmpeg" };
  const result = validateAssetEntry(traversal);
  assert.equal(result.ok, false);
  assert.match(result.reason, /unsafe relativePath/i);
});
```

### 6.1 Reference validator implementation (embedded — the logic the test exercises)

```ts
// runtime-asset-manifest.ts (reference implementation — embedded here, not yet a file)
export interface RuntimeContext {
  platform: "darwin" | "win32";
  architecture: "arm64" | "x64";
  fileSha256: string; // actual sha256 of the file at the resolved path
}
export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };
export type MatchResult =
  | { ok: true; entry: AssetEntry }
  | { ok: false; reason: string };

const NAMES = new Set(["ffmpeg", "ffprobe"]);
const PLATFORMS = new Set(["darwin", "win32"]);
const ARCHES = new Set(["arm64", "x64"]);
const LICENSES = new Set(["LGPL-2.1-or-later", "GPL-3.0-only", "GPL-2.0-or-later"]);
const SHA256 = /^[0-9a-f]{64}$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function validateAssetEntry(entry: unknown): ValidationResult {
  if (!isObject(entry)) return { ok: false, reason: "entry is not an object" };
  const e = entry;

  // --- required primitives ---
  if (typeof e.name !== "string" || !NAMES.has(e.name))
    return { ok: false, reason: `invalid or missing name: ${String(e.name)}` };
  if (typeof e.version !== "string" || e.version.length === 0)
    return { ok: false, reason: "missing required field: version" };
  if (typeof e.platform !== "string" || !PLATFORMS.has(e.platform))
    return { ok: false, reason: `invalid platform: ${String(e.platform)}` };
  if (typeof e.architecture !== "string" || !ARCHES.has(e.architecture))
    return { ok: false, reason: `invalid architecture: ${String(e.architecture)}` };

  // --- relativePath safety ---
  if (typeof e.relativePath !== "string" || e.relativePath.length === 0)
    return { ok: false, reason: "missing required field: relativePath" };
  if (e.relativePath.startsWith("/"))
    return { ok: false, reason: "unsafe relativePath: absolute path" };
  if (e.relativePath.split("/").some((seg) => seg === ".."))
    return { ok: false, reason: "unsafe relativePath: contains '..'" };

  // --- checksum ---
  if (typeof e.checksum !== "string" || !SHA256.test(e.checksum))
    return { ok: false, reason: "invalid checksum format (expect 64-hex sha256)" };
  if (typeof e.checksumSource !== "string" || e.checksumSource.length === 0)
    return { ok: false, reason: "missing required field: checksumSource" };
  if (typeof e.sourceUrl !== "string" || e.sourceUrl.length === 0)
    return { ok: false, reason: "missing required field: sourceUrl" };
  if (typeof e.license !== "string" || !LICENSES.has(e.license))
    return { ok: false, reason: "missing required field: license (or unknown SPDX id)" };

  // --- capabilities ---
  if (!isObject(e.capabilities))
    return { ok: false, reason: "missing required field: capabilities" };
  const c = e.capabilities;
  for (const key of ["encodeCodecs", "decodeCodecs", "containers", "filters", "protocols", "subtitleFormats"]) {
    if (!isStringArray(c[key]))
      return { ok: false, reason: `capabilities.${key} must be a string array` };
  }

  // --- buildConfig ---
  if (!isObject(e.buildConfig))
    return { ok: false, reason: "missing required field: buildConfig" };
  const b = e.buildConfig;
  if (typeof b.upstreamVersion !== "string" || b.upstreamVersion.length === 0)
    return { ok: false, reason: "missing required field: buildConfig.upstreamVersion" };
  if (!isStringArray(b.configureFlags))
    return { ok: false, reason: "buildConfig.configureFlags must be a string array" };
  if (typeof b.toolchain !== "string" || b.toolchain.length === 0)
    return { ok: false, reason: "missing required field: buildConfig.toolchain" };
  if (typeof b.staticLinking !== "boolean")
    return { ok: false, reason: "missing required field: buildConfig.staticLinking" };
  if (typeof b.hasGplComponents !== "boolean")
    return { ok: false, reason: "missing required field: buildConfig.hasGplComponents" };
  if (typeof b.hasNonfreeComponents !== "boolean")
    return { ok: false, reason: "missing required field: buildConfig.hasNonfreeComponents" };

  // --- semantic invariants ---
  if (b.hasNonfreeComponents)
    return { ok: false, reason: "nonfree components are not redistributable" };
  if (b.hasGplComponents && !String(e.license).startsWith("GPL-"))
    return { ok: false, reason: "license/gpl consistency: GPL build must declare a GPL license" };

  // --- capability floor (ffmpeg only) ---
  if (e.name === "ffmpeg") {
    const enc = c.encodeCodecs as string[];
    const filters = c.filters as string[];
    const protocols = c.protocols as string[];
    const subs = c.subtitleFormats as string[];
    if (!enc.includes("libmp3lame"))
      return { ok: false, reason: "missing mandatory encode codec: libmp3lame" };
    if (!filters.includes("aresample") || !filters.includes("volume"))
      return { ok: false, reason: "missing mandatory filter: aresample/volume" };
    if (!protocols.includes("concat"))
      return { ok: false, reason: "missing mandatory protocol: concat" };
    if (!subs.some((s) => s === "mov_text" || s === "subrip" || s === "srt"))
      return { ok: false, reason: "missing mandatory subtitle format (mov_text/subrip/srt)" };
  }

  return { ok: true };
}

export function matchRuntimeAsset(
  entries: AssetEntry[],
  ctx: RuntimeContext,
): MatchResult {
  const candidates = entries.filter(
    (e) => e.platform === ctx.platform && e.architecture === ctx.architecture,
  );
  if (candidates.length === 0)
    return { ok: false, reason: `platform mismatch: no asset for ${ctx.platform}-${ctx.architecture}` };
  // (multi-asset: prefer ffmpeg/ffprobe by name at the call site)
  const entry = candidates[0];
  if (entry.checksum !== ctx.fileSha256)
    return { ok: false, reason: "checksum mismatch: asset may be corrupt or tampered" };
  return { ok: true, entry };
}
```

## 7. Verify Clause (AC-T023)

> **Schema accepts a darwin-arm64 ffmpeg asset; rejects wrong-platform / checksum-mismatch /
> missing-metadata entries.**

| Check | Covered by test |
|---|---|
| Accepts well-formed darwin-arm64 ffmpeg | `ACCEPTS a well-formed darwin-arm64 ffmpeg asset` |
| Rejects wrong-platform (win32 on darwin runtime) | `REJECTS a wrong-platform entry` |
| Rejects checksum mismatch (tampered bytes on disk) | `REJECTS a checksum-mismatch entry at runtime` |
| Rejects missing-metadata (no license) | `REJECTS missing-metadata entry` |
| Rejects nonfree build posture | `REJECTS nonfree build posture` |
| Rejects ffmpeg missing libmp3lame | `REJECTS ffmpeg missing mandatory libmp3lame` |
| Rejects path-traversal relativePath | `REJECTS unsafe relativePath containing '..'` |

All fields required by the task are present in the schema:
`name`, `version`, `platform`, `architecture`, `relativePath`, `checksum`, `checksumSource`,
`sourceUrl`, `license`, `capabilities` (codecs/containers/filters/protocols/subtitleFormats),
`buildConfig` (upstreamVersion/configureFlags/toolchain/staticLinking/hasGplComponents/hasNonfreeComponents).

## 8. Inputs to Downstream Tasks

- **W1-C T082** is implemented in `src/lib/runtime-asset-manifest.ts` and
  `desktop/runtime-assets.js`; both the server-side and Electron-side tests cover
  `matchRuntimeAsset` and SHA-256 verification.
- **W2-E T151** is implemented in `scripts/desktop-package.mjs`: it emits
  `runtime/assets.manifest.json` only when a complete per-target pair and metadata
  are present, then validates the emitted envelope before packaging. **W3-B T181**
  remains open until real redistributable binaries and provenance are supplied.
- **T021's** recommended LGPL build populates the example in §5 once OPEN-001..003 close.
- **T020's** mandatory capability set (libmp3lame, aresample, volume, concat, mov_text/srt)
  is encoded directly into the §4.2 capability floor, so a binary that cannot serve
  DeepListener's actual usage is rejected at validation time, not discovered at runtime.
