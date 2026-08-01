#!/usr/bin/env node
/**
 * T011 — Standalone package-content audit.
 *
 * Asserts that a Next.js standalone bundle contains every runtime asset the
 * desktop shell needs to host the service without the repository or a full
 * node_modules tree. Fails (exit 1) if any required file is missing.
 *
 * Usage: node docs/desktop-w0/standalone/package-content-audit.mjs <standalone-root>
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root || !existsSync(root)) {
  console.error("usage: package-content-audit.mjs <standalone-root>");
  process.exit(2);
}

// Required runtime assets. Each entry: [relativePath, description, minBytes?]
const REQUIRED = [
  ["server.js", "Next.js minimal standalone server", 1000],
  ["node_modules/@prisma/client/default.js", "Prisma client entrypoint"],
  ["node_modules/@prisma/client/runtime/library.js", "Prisma client runtime"],
  ["node_modules/.prisma/client/index.js", "Prisma generated client"],
  ["node_modules/.prisma/client/schema.prisma", "Prisma generated schema"],
  // Prisma native query engine — platform-specific suffix; matched by glob below
  ["node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node", "Prisma darwin-arm64 query engine", 100000],
  ["package.json", "package manifest"],
  [".next/static", "Next.js static assets (chunks/css/media)"],
];

let missing = 0;
let tooSmall = 0;

for (const [rel, desc, minBytes] of REQUIRED) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    console.error(`MISSING: ${rel}  (${desc})`);
    missing++;
    continue;
  }
  if (minBytes && statSync(abs).size < minBytes) {
    console.error(
      `TOO SMALL: ${rel} = ${statSync(abs).size}B < ${minBytes}B  (${desc})`,
    );
    tooSmall++;
  } else {
    const sizeInfo = statSync(abs).isDirectory()
      ? "dir"
      : `${statSync(abs).size}B`;
    console.log(`OK: ${rel}  (${sizeInfo})  — ${desc}`);
  }
}

if (missing > 0 || tooSmall > 0) {
  console.error(
    `\nAUDIT FAILED: ${missing} missing, ${tooSmall} too-small required assets.`,
  );
  process.exit(1);
}
console.log(`\nAUDIT PASSED: all ${REQUIRED.length} required assets present.`);
