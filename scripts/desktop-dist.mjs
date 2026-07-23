#!/usr/bin/env node
/**
 * Desktop distribution builder (DFS-006).
 *
 * One-shot pipeline that produces a distributable macOS dmg from a clean
 * repository state. It chains the two existing steps in the right order:
 *
 *   1. `npm run desktop:package` (repo root) — builds the Next.js standalone
 *      bundle + static assets + Prisma migrations + (optional) vendored ffmpeg
 *      into `.desktop-build/standalone`.
 *   2. `electron-builder` (from desktop/) — packs the Electron shell together
 *      with the standalone bundle into a signed-or-unsigned dmg under
 *      `.desktop-build/dist/`.
 *
 * Why this script exists: the two steps have to run in this order, and they
 * live in different working directories with different node_modules trees.
 * Doing it by hand is error-prone; a single entry point makes the release
 * path reproducible for CI and for a fresh maintainer machine.
 *
 * Usage:
 *   node scripts/desktop-dist.mjs                # full: package + dist
 *   node scripts/desktop-dist.mjs --no-package   # skip standalone build
 *   node scripts/desktop-dist.mjs --dir          # produce unpacked .app only
 *
 * The script never signs or notarizes unless the relevant env vars are set
 * (CSC_LINK, APPLE_ID, …). An unsigned alpha is the default output.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const desktopDir = path.join(repo, "desktop");

const args = process.argv.slice(2);
const skipPackage = args.includes("--no-package");
const dirOnly = args.includes("--dir");

function log(msg) {
  process.stdout.write(`[desktop-dist] ${msg}\n`);
}
function fail(msg) {
  process.stderr.write(`[desktop-dist] ERROR: ${msg}\n`);
  process.exit(1);
}

function run(cmd, cmdArgs, opts) {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", ...opts });
  if (r.status !== 0) fail(`${cmd} ${cmdArgs.join(" ")} failed (exit ${r.status})`);
}

// --- 1. build standalone bundle (unless skipped) -----------------------
if (!skipPackage) {
  log("step 1/2: building Next.js standalone bundle (npm run desktop:package)...");
  run("npm", ["run", "desktop:package"], { cwd: repo });
} else {
  log("--no-package: skipping standalone build");
}

const standaloneRoot = path.join(repo, ".desktop-build", "standalone");
if (!existsSync(path.join(standaloneRoot, "server.js"))) {
  fail(`standalone server.js missing at ${standaloneRoot}; run without --no-package.`);
}
log(`standalone bundle ready: ${standaloneRoot}`);

// --- 2. ensure desktop/ dependencies are installed ---------------------
// electron-builder is a desktop/ devDependency. Bail with a clear message if
// it is missing rather than letting the spawn fail with ENOENT.
const ebPath = path.join(desktopDir, "node_modules", ".bin", "electron-builder");
if (!existsSync(ebPath)) {
  fail(
    `electron-builder not found at ${ebPath}.\n` +
    `Run this once before distributing:  (cd desktop && npm install)`,
  );
}

// --- 3. run electron-builder ------------------------------------------
const ebArgs = dirOnly ? ["--dir"] : [];
log(`step 2/2: electron-builder ${dirOnly ? "(--dir, unpacked .app)" : "(dmg)"}...`);
run(ebPath, ebArgs, { cwd: desktopDir });

log("\nDesktop distribution complete.");
log(`Artifacts under: ${path.join(repo, ".desktop-build", "dist")}`);
