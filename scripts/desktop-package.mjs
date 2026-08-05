#!/usr/bin/env node
/**
 * W2-E T150 — Desktop standalone packaging script.
 *
 * Produces a self-contained Next.js standalone bundle that an Electron shell
 * can launch without the repository or a full node_modules. What it does:
 *
 *   1. runs `npm run build` (output: "standalone") to produce .next/standalone;
 *   2. copies `.next/static` into the bundle (Next does NOT trace it — W0 T011);
 *   3. copies `prisma/migrations` so the offline migration runner (T140) works;
 *   4. verifies the Prisma engine + generated client are present;
 *   5. emits a redacted runtime manifest (versions, no secrets);
 *   6. copies the package-content audit so CI/W3 can assert completeness.
 *
 * Output goes to a staging dir (default: .desktop-build/standalone). It never
 * touches prisma/dev.db, public/uploads, public/videos, or .env*.
 *
 * Usage:
 *   node scripts/desktop-package.mjs [--staging <dir>] [--no-build]
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateManifest } = require("../desktop/runtime-assets.js");

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}
const staging = path.resolve(flag("staging") || path.join(repo, ".desktop-build", "standalone"));
const skipBuild = args.includes("--no-build");
const targetPlatform = process.env.DEEPLISTENER_TARGET_PLATFORM || process.platform;
const targetArchitecture = process.env.DEEPLISTENER_TARGET_ARCH || process.arch;
const runtimeTarget = `${targetPlatform}-${targetArchitecture}`;
const releaseChannel = process.env.DEEPLISTENER_RELEASE_CHANNEL === "internal-alpha"
  ? "internal-alpha"
  : "public";
const systemFfmpegFallback = releaseChannel === "internal-alpha"
  && process.env.DEEPLISTENER_ALLOW_SYSTEM_FFMPEG === "1";

const prismaEngines = {
  "darwin-arm64": "node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node",
  "darwin-x64": "node_modules/.prisma/client/libquery_engine-darwin.dylib.node",
  "win32-x64": "node_modules/.prisma/client/query_engine-windows.dll.node",
};
const prismaEnginePath = prismaEngines[runtimeTarget];
if (!prismaEnginePath) {
  fail(`unsupported Desktop runtime target ${runtimeTarget}; supported targets: ${Object.keys(prismaEngines).join(", ")}`);
}

function log(msg) {
  process.stdout.write(`[desktop-package] ${msg}\n`);
}
function fail(msg) {
  process.stderr.write(`[desktop-package] ERROR: ${msg}\n`);
  process.exit(1);
}

// --- 1. build standalone ------------------------------------------------
if (!skipBuild) {
  log("running npm run build (output: standalone)...");
  const r = spawnSync("npm", ["run", "build"], { cwd: repo, stdio: "inherit" });
  if (r.status !== 0) fail(`build failed (exit ${r.status})`);
} else {
  log("--no-build: skipping build (assuming .next/standalone exists)");
}

const standaloneSrc = path.join(repo, ".next", "standalone");
if (!existsSync(path.join(standaloneSrc, "server.js"))) {
  fail(`standalone server.js not found at ${standaloneSrc}; run without --no-build.`);
}

// --- 2. prepare staging -------------------------------------------------
if (existsSync(staging)) {
  log(`cleaning existing staging: ${staging}`);
  rmSync(staging, { recursive: true, force: true });
}
mkdirSync(staging, { recursive: true });

// --- 3. copy standalone bundle -----------------------------------------
log(`copying standalone bundle → ${staging}`);
cpSync(standaloneSrc, staging, { recursive: true });

// --- 4. copy .next/static (Next does NOT trace it) ---------------------
const staticSrc = path.join(repo, ".next", "static");
const staticDst = path.join(staging, ".next", "static");
if (!existsSync(staticSrc)) fail(`.next/static missing at ${staticSrc}`);
mkdirSync(path.dirname(staticDst), { recursive: true });
cpSync(staticSrc, staticDst, { recursive: true });
log(`copied .next/static → ${path.relative(staging, staticDst)}`);

// --- 5. remove any traced .env / user data from the bundle --------------
for (const sensitive of [".env", ".env.local", ".env.production"]) {
  const p = path.join(staging, sensitive);
  if (existsSync(p)) {
    rmSync(p);
    log(`removed traced ${sensitive} from bundle (Desktop injects env explicitly)`);
  }
}
// Remove traced SQLite databases. Next.js file tracing picks up dev.db /
// prisma/dev.db from the repo root because something in the dependency graph
// touches the prisma client at build time. These are PERSONAL USER DATA
// (learning history, review logs, uploaded-media metadata) and must NEVER
// ship in a distributable. The Desktop shell initializes its own fresh DB
// under the OS user-data directory at first launch.
for (const dbFile of ["dev.db", "dev.db-journal", "prisma/dev.db", "prisma/dev.db-journal"]) {
  const p = path.join(staging, dbFile);
  if (existsSync(p)) {
    const size = statSync(p).size;
    rmSync(p);
    log(`removed traced ${dbFile} (${(size / 1024 / 1024).toFixed(1)} MB) — user data must not ship`);
  }
}
// Also drop any prisma backup files that may have been traced.
const prismaDir = path.join(staging, "prisma");
if (existsSync(prismaDir)) {
  for (const entry of readdirSync(prismaDir)) {
    if (/\.db(\.journal|\.backup|\.pre-.*)?$/.test(entry) && !entry.endsWith(".toml")) {
      const p = path.join(prismaDir, entry);
      if (existsSync(p) && statSync(p).isFile()) {
        rmSync(p, { force: true });
        log(`removed traced prisma/${entry} — user data must not ship`);
      }
    }
  }
}
// Remove traced local secrets if present.
const secretsPath = path.join(staging, "settings", "secrets.json");
if (existsSync(secretsPath)) {
  rmSync(secretsPath);
  log(`removed traced settings/secrets.json — credentials must not ship`);
}
// Remove traced public/uploads and public/videos (repo files, not user data,
// but they must not ship). Keep only immutable public assets (icons etc.).
for (const userDir of ["public/uploads", "public/videos"]) {
  const p = path.join(staging, userDir);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    mkdirSync(p, { recursive: true });
    // preserve .gitkeep so dir structure is intentional
    writeFileSync(path.join(p, ".gitkeep"), "");
    log(`cleared traced ${userDir} (user data must not ship)`);
  }
}

// --- 6. copy Prisma migrations (for offline migration runner T140) -----
const migrationsSrc = path.join(repo, "prisma", "migrations");
const migrationsDst = path.join(staging, "prisma", "migrations");
if (!existsSync(migrationsSrc)) fail(`prisma/migrations missing at ${migrationsSrc}`);
mkdirSync(path.dirname(migrationsDst), { recursive: true });
cpSync(migrationsSrc, migrationsDst, { recursive: true });
log(`copied prisma/migrations (${countMigrations(migrationsDst)} migrations)`);

// --- 6b. copy target-specific FFmpeg/ffprobe binaries (DFS-005/T082) -----
// A packaged app may execute only binaries accompanied by a checked-in asset
// metadata file. The metadata is intentionally not invented here: provenance,
// license, capability, and build flags belong to the release asset owner.
const ffmpegVendorSrc = path.join(repo, "vendor", "ffmpeg");
const ffmpegTargetSrc = path.join(ffmpegVendorSrc, runtimeTarget);
const ffmpegRuntimeDst = path.join(staging, "runtime", runtimeTarget);
const executableNames = targetPlatform === "win32"
  ? { ffmpeg: "ffmpeg.exe", ffprobe: "ffprobe.exe" }
  : { ffmpeg: "ffmpeg", ffprobe: "ffprobe" };
let copiedBinaries = 0;
for (const [name, executable] of Object.entries(executableNames)) {
  const candidates = [
    path.join(ffmpegTargetSrc, executable),
    // Legacy development layout is accepted as an input only; the output is
    // always normalized to runtime/<platform>-<arch>/.
    path.join(ffmpegVendorSrc, executable),
    targetPlatform === "win32" ? path.join(ffmpegTargetSrc, name) : null,
    targetPlatform === "win32" ? path.join(ffmpegVendorSrc, name) : null,
  ].filter(Boolean);
  const src = candidates.find((candidate) => existsSync(candidate));
  if (src) {
    if (copiedBinaries === 0) mkdirSync(ffmpegRuntimeDst, { recursive: true });
    cpSync(src, path.join(ffmpegRuntimeDst, executable));
    // Preserve executable bit (cpSync copies mode, but be explicit for safety).
    try {
      chmodSync(path.join(ffmpegRuntimeDst, executable), 0o755);
    } catch { /* non-fatal on platforms that reject chmod */ }
    copiedBinaries++;
  }
}
if (copiedBinaries > 0) {
  log(`copied ${copiedBinaries} vendored ffmpeg binaries → ${path.relative(staging, ffmpegRuntimeDst)}`);
} else {
  log(`no vendored FFmpeg pair found for ${runtimeTarget}; packaged runtime manifest will be absent`);
}

const metadataCandidates = [
  path.join(ffmpegTargetSrc, "assets.json"),
  path.join(ffmpegVendorSrc, `${runtimeTarget}.assets.json`),
];
const metadataPath = metadataCandidates.find((candidate) => existsSync(candidate));
if (copiedBinaries === 2 && metadataPath) {
  try {
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    const rawEntries = Array.isArray(metadata) ? metadata : metadata.assets;
    if (!Array.isArray(rawEntries) || rawEntries.length !== 2) {
      fail(`FFmpeg metadata must contain exactly two assets: ${metadataPath}`);
    }
    const assets = rawEntries.map((entry) => {
      const name = entry.name;
      const executable = executableNames[name];
      if (!executable || typeof entry !== "object" || entry === null) {
        fail(`FFmpeg metadata has an invalid asset name: ${String(name)}`);
      }
      const filePath = path.join(ffmpegRuntimeDst, executable);
      const checksum = createHash("sha256").update(readFileSync(filePath)).digest("hex");
      return {
        ...entry,
        name,
        platform: targetPlatform,
        architecture: targetArchitecture,
        relativePath: `runtime/${runtimeTarget}/${executable}`,
        checksum,
      };
    });
    mkdirSync(path.join(staging, "runtime"), { recursive: true });
    writeFileSync(
      path.join(staging, "runtime", "assets.manifest.json"),
      `${JSON.stringify({
        manifestVersion: 1,
        generatedAt: new Date().toISOString(),
        generatedFromCommit: process.env.GIT_COMMIT || "working-tree",
        releaseChannel: process.env.DEEPLISTENER_RELEASE_CHANNEL || "internal",
        assets,
      }, null, 2)}\n`,
      "utf8",
    );
    const emittedManifest = JSON.parse(readFileSync(path.join(staging, "runtime", "assets.manifest.json"), "utf8"));
    const manifestValidation = validateManifest(emittedManifest);
    if (!manifestValidation.ok) {
      fail(`emitted runtime asset manifest failed validation: ${manifestValidation.reason}`);
    }
    log(`wrote verified runtime asset manifest for ${runtimeTarget}`);
  } catch (error) {
    fail(`failed to generate FFmpeg runtime manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
} else if (copiedBinaries === 2) {
  log(`FFmpeg pair copied but metadata is missing; refusing to emit a runtime manifest for ${runtimeTarget}`);
}

// --- 7. verify required runtime assets --------------------------------
const required = [
  ["server.js", "Next standalone server"],
  ["node_modules/@prisma/client/default.js", "Prisma client entrypoint"],
  ["node_modules/.prisma/client/index.js", "Prisma generated client"],
  ["node_modules/.prisma/client/schema.prisma", "Prisma generated schema"],
  [prismaEnginePath, `Prisma ${runtimeTarget} query engine`],
  [".next/static", "Next static assets"],
  ["prisma/migrations", "Migration SQL"],
];
for (const [rel, desc] of required) {
  if (!existsSync(path.join(staging, rel))) {
    fail(`required asset missing after packaging: ${rel} (${desc})`);
  }
}
log(`verified ${required.length} required runtime assets present`);

// --- 8. emit redacted runtime manifest --------------------------------
const pkg = JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8"));
const manifest = {
  schemaVersion: 1,
  releaseChannel,
  applicationVersion: pkg.version,
  packagedAt: new Date().toISOString(),
  platform: targetPlatform,
  architecture: targetArchitecture,
  nodeVersion: process.version,
  nextVersion: pkg.dependencies?.next,
  prismaVersion: pkg.dependencies?.["@prisma/client"],
  build: {
    standalone: true,
    staticAssetsCopied: true,
    migrationsBundled: countMigrations(migrationsDst),
    prismaEngine: path.basename(prismaEnginePath),
    vendoredFfmpeg: copiedBinaries,
    runtimeAssetManifest: existsSync(path.join(staging, "runtime", "assets.manifest.json")),
    systemFfmpegFallback,
  },
  // NO secrets, NO user data, NO absolute user paths.
};
writeFileSync(
  path.join(staging, "runtime-manifest.json"),
  JSON.stringify(manifest, null, 2),
);
log(`wrote runtime-manifest.json (schemaVersion ${manifest.schemaVersion})`);

log(`\nDesktop bundle ready: ${staging}`);
log("Launch test: PORT=47000 DATABASE_URL=file:/tmp/dl-test.db node server.js");

function countMigrations(dir) {
  try {
    return readdirSync(dir).filter((d) => !d.endsWith(".toml") && !d.startsWith(".")).length;
  } catch {
    return 0;
  }
}
