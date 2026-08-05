#!/usr/bin/env node
/**
 * Cross-platform, non-publishing audit for a generated Desktop standalone
 * staging directory. This is deliberately independent of a specific Prisma
 * engine filename so the same check can run on macOS arm64 and Windows x64.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.argv[2] && path.resolve(process.argv[2]);
if (!root || !existsSync(root)) {
  console.error("usage: node scripts/desktop-package-audit.mjs <staging-root>");
  process.exit(2);
}

const required = [
  "server.js",
  ".next/static",
  "prisma/migrations",
  "node_modules/@prisma/client/default.js",
  "node_modules/.prisma/client/index.js",
  "runtime-manifest.json",
];
const failures = [];
for (const relative of required) {
  const target = path.join(root, ...relative.split("/"));
  if (!existsSync(target)) failures.push(`missing required asset: ${relative}`);
}

const manifestPath = path.join(root, "runtime-manifest.json");
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.schemaVersion !== 1 || manifest.build?.standalone !== true) {
      failures.push("runtime-manifest.json is not a standalone schemaVersion 1 manifest");
    }
  } catch {
    failures.push("runtime-manifest.json is not valid JSON");
  }
}

for (const forbidden of ["dev.db", "prisma/dev.db", "settings/secrets.json"]) {
  if (existsSync(path.join(root, ...forbidden.split("/")))) failures.push(`forbidden user-data asset present: ${forbidden}`);
}
for (const relative of ["public/uploads", "public/videos"]) {
  const directory = path.join(root, ...relative.split("/"));
  if (!existsSync(directory)) continue;
  const unexpected = readdirSync(directory).filter((entry) => entry !== ".gitkeep");
  if (unexpected.length > 0) failures.push(`user media copied into ${relative}: ${unexpected.join(", ")}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[desktop-package-audit] ERROR: ${failure}`);
  process.exit(1);
}

const fileCount = (() => {
  let count = 0;
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (statSync(target).isFile()) count += 1;
    }
  };
  visit(root);
  return count;
})();
console.log(`[desktop-package-audit] PASS: ${fileCount} files, no traced user data`);
