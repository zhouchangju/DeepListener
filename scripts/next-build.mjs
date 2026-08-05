#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const registerPath = path.join(scriptDir, "lightningcss-wasm-register.cjs");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const swcWasmDir = path.join(projectRoot, "node_modules", "@next", "swc-wasm-nodejs");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const nodeOptions = [existingNodeOptions, "--require", registerPath].filter(Boolean).join(" ");
const standaloneOutputDir = path.join(projectRoot, ".next", "standalone");

// `next dev` and repeated standalone builds share `.next`. Finder may recreate
// `.DS_Store` while `rmSync` walks a large traced node_modules tree, leaving an
// ENOTEMPTY directory behind. Atomically move the generated subtree out of
// `.next` first so Next always sees a clean destination, then delete the stale
// tree from the OS temp directory. Dev output and caches remain untouched.
if (existsSync(standaloneOutputDir)) {
  const preferredStaleOutputDir = path.join(
    os.tmpdir(),
    `deeplistener-next-standalone-${process.pid}-${Date.now()}`,
  );
  let staleOutputDir = preferredStaleOutputDir;
  try {
    renameSync(standaloneOutputDir, staleOutputDir);
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }

    // Windows can place the OS temp directory on a different volume from the
    // checkout. A cross-volume rename cannot be atomic, so fall back to a
    // disposable sibling inside `.next`, which is guaranteed to share the
    // volume with the generated standalone output.
    staleOutputDir = path.join(
      path.dirname(standaloneOutputDir),
      `.standalone-stale-${process.pid}-${Date.now()}`,
    );
    console.warn(
      "[next-build] OS temp directory is on another volume; using a same-volume cleanup path.",
    );
    renameSync(standaloneOutputDir, staleOutputDir);
  }
  let cleanupError;
  for (let attempt = 0; attempt < 3 && existsSync(staleOutputDir); attempt += 1) {
    try {
      rmSync(staleOutputDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
      cleanupError = undefined;
    } catch (error) {
      cleanupError = error;
      // Finder can recreate this after the recursive walk has emptied the
      // directory. Remove it explicitly before the next bounded retry.
      rmSync(path.join(staleOutputDir, ".DS_Store"), { force: true });
    }
  }
  if (existsSync(staleOutputDir)) {
    console.warn(`[next-build] deferred stale standalone cleanup: ${cleanupError?.message}`);
  }
}

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
