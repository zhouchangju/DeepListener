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

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}
const staging = path.resolve(flag("staging") || path.join(repo, ".desktop-build", "standalone"));
const skipBuild = args.includes("--no-build");

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

// --- 6b. optionally copy vendored FFmpeg/ffprobe binaries (DFS-005) -----
// DeepListener's media import (video MP3 extraction, audio export) needs
// ffmpeg/ffprobe. Desktop resolves them via env → vendored → system PATH.
// Vendoring is OPTIONAL: if vendor/ffmpeg/{ffmpeg,ffprobe} are present in the
// repo, they are copied into the bundle so the app works without a system
// install. If absent, the app relies on the user's system PATH (acceptable
// for technical users). This keeps the bundle small by default.
const ffmpegVendorSrc = path.join(repo, "vendor", "ffmpeg");
const ffmpegVendorDst = path.join(staging, "vendor", "ffmpeg");
const ffmpegBinaries = ["ffmpeg", "ffprobe"];
let copiedBinaries = 0;
for (const bin of ffmpegBinaries) {
  const src = path.join(ffmpegVendorSrc, bin);
  if (existsSync(src)) {
    if (copiedBinaries === 0) mkdirSync(ffmpegVendorDst, { recursive: true });
    cpSync(src, path.join(ffmpegVendorDst, bin));
    // Preserve executable bit (cpSync copies mode, but be explicit for safety).
    try {
      chmodSync(path.join(ffmpegVendorDst, bin), 0o755);
    } catch { /* non-fatal on platforms that reject chmod */ }
    copiedBinaries++;
  }
}
if (copiedBinaries > 0) {
  log(`copied ${copiedBinaries} vendored ffmpeg binaries → ${path.relative(staging, ffmpegVendorDst)}`);
} else {
  log("no vendored ffmpeg binaries found; app will rely on system PATH");
}

// --- 7. verify required runtime assets --------------------------------
const required = [
  ["server.js", "Next standalone server"],
  ["node_modules/@prisma/client/default.js", "Prisma client entrypoint"],
  ["node_modules/.prisma/client/index.js", "Prisma generated client"],
  ["node_modules/.prisma/client/schema.prisma", "Prisma generated schema"],
  ["node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node", "Prisma darwin-arm64 engine"],
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
  applicationVersion: pkg.version,
  packagedAt: new Date().toISOString(),
  platform: process.platform,
  architecture: process.arch,
  nodeVersion: process.version,
  nextVersion: pkg.dependencies?.next,
  prismaVersion: pkg.dependencies?.["@prisma/client"],
  build: {
    standalone: true,
    staticAssetsCopied: true,
    migrationsBundled: countMigrations(migrationsDst),
    prismaEngine: detectEngineName(staging),
    vendoredFfmpeg: copiedBinaries,
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
function detectEngineName(stagingRoot) {
  try {
    const dir = path.join(stagingRoot, "node_modules/.prisma/client");
    return readdirSync(dir).find((f) => f.startsWith("libquery_engine")) || null;
  } catch {
    return null;
  }
}
