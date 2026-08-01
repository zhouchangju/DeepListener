#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const registerPath = path.join(scriptDir, "lightningcss-wasm-register.cjs");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const swcWasmDir = path.join(projectRoot, "node_modules", "@next", "swc-wasm-nodejs");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const nodeOptions = [existingNodeOptions, "--require", registerPath].filter(Boolean).join(" ");
const standaloneOutputDir = path.join(projectRoot, ".next", "standalone");

// `next dev` and repeated standalone builds share `.next`. A stale traced
// node_modules tree can make Next's own cleanup fail with ENOTEMPTY before the
// build starts. Only remove the generated standalone subtree; keep dev output
// and caches intact.
rmSync(standaloneOutputDir, {
  recursive: true,
  force: true,
  maxRetries: 3,
  retryDelay: 100,
});

// Turbopack uses the native compiler path on supported developer machines.
// Keep the WASM environment fallback below for restricted runtimes and the
// existing CI contract, but avoid Webpack's failing WASM hash implementation.
const child = spawn(process.execPath, [nextBin, "build", "--turbopack"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TEST_WASM_DIR: process.env.NEXT_TEST_WASM_DIR ?? swcWasmDir,
    NODE_OPTIONS: nodeOptions,
  },
});

child.once("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.once("exit", (code, signal) => {
  if (signal) {
    console.error(`Next.js build exited from signal ${signal}.`);
  }
  process.exit(code ?? 1);
});
