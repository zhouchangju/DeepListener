#!/usr/bin/env node
/**
 * Release preflight for the unsigned/signed desktop distribution pipeline.
 *
 * The alpha path may explicitly allow the two host-dependent inputs that are
 * not suitable for a public release: system FFmpeg and the synthetic demo.
 * A normal release preflight fails closed until both are replaced by
 * redistributable assets.
 */
import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const allowSystemFfmpeg = args.has("--allow-system-ffmpeg");
const allowSyntheticDemo = args.has("--allow-synthetic-demo");

const failures = [];
const warnings = [];

function log(message) {
  process.stdout.write(`[desktop-preflight] ${message}\n`);
}

function checkBinary(label, candidate) {
  if (!existsSync(candidate)) return false;
  try {
    accessSync(candidate, constants.X_OK);
    execFileSync(candidate, ["-version"], { stdio: "ignore", timeout: 5_000 });
    log(`${label}: ${candidate}`);
    return true;
  } catch {
    failures.push(`${label} exists but is not executable or cannot start: ${candidate}`);
    return false;
  }
}

function checkSystemBinary(label, command) {
  const result = spawnSync(command, ["-version"], { stdio: "ignore", timeout: 5_000 });
  if (result.status === 0) {
    log(`${label}: system PATH (${command})`);
    return true;
  }
  return false;
}

const vendorDir = path.join(repo, "vendor", "ffmpeg");
const vendoredFfmpeg = checkBinary("ffmpeg", path.join(vendorDir, "ffmpeg"));
const vendoredFfprobe = checkBinary("ffprobe", path.join(vendorDir, "ffprobe"));
if (!vendoredFfmpeg || !vendoredFfprobe) {
  if (allowSystemFfmpeg && checkSystemBinary("ffmpeg", "ffmpeg") && checkSystemBinary("ffprobe", "ffprobe")) {
    warnings.push("Using system FFmpeg; this is acceptable only for internal alpha builds.");
  } else {
    failures.push(
      "A public desktop build needs matching redistributable vendor/ffmpeg/ffmpeg and vendor/ffmpeg/ffprobe binaries. " +
      "Use --allow-system-ffmpeg only for an internal alpha build.",
    );
  }
}

const provenancePath = path.join(repo, "public", "demo", "PROVENANCE.md");
const provenance = existsSync(provenancePath) ? readFileSync(provenancePath, "utf8") : "";
if (!provenance) {
  failures.push("public/demo/PROVENANCE.md is missing.");
} else if (/TODO|synthetic|sine wave|lavfi/i.test(provenance)) {
  if (allowSyntheticDemo) {
    warnings.push("Using the synthetic demo; this is acceptable only for internal alpha builds.");
  } else {
    failures.push(
      "The bundled demo is still synthetic or has incomplete provenance. Add a real spoken-English asset with redistribution rights before public release.",
    );
  }
}

const migrationDir = path.join(repo, "prisma", "migrations");
if (!existsSync(migrationDir)) failures.push("prisma/migrations is missing.");
const packageJsonPath = path.join(repo, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
if (Number.parseInt(process.versions.node, 10) < 22) {
  failures.push(`Node.js 22+ is required; found ${process.versions.node}.`);
}
if (packageJson.engines?.node !== ">=22") {
  failures.push("package.json must declare Node.js >=22.");
}

if (warnings.length) for (const warning of warnings) log(`WARNING: ${warning}`);
if (failures.length) {
  for (const failure of failures) process.stderr.write(`[desktop-preflight] ERROR: ${failure}\n`);
  process.exit(1);
}

log(`PASS: ${allowSystemFfmpeg || allowSyntheticDemo ? "internal alpha" : "public release"} preflight`);
