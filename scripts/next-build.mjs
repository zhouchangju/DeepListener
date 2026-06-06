#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const registerPath = path.join(scriptDir, "lightningcss-wasm-register.cjs");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const swcWasmDir = path.join(projectRoot, "node_modules", "@next", "swc-wasm-nodejs");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const nodeOptions = [existingNodeOptions, "--require", registerPath].filter(Boolean).join(" ");

const result = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NAPI_RS_FORCE_WASI: process.env.NAPI_RS_FORCE_WASI ?? "1",
    NEXT_TEST_WASM_DIR: process.env.NEXT_TEST_WASM_DIR ?? swcWasmDir,
    NODE_OPTIONS: nodeOptions,
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
