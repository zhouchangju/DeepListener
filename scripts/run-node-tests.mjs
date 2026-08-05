import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (["node_modules", ".next", ".desktop-build", "dist"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (/\.test\.(?:[cm]?js|tsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// `node --test` interprets each trailing argument as a glob(7) pattern, so a
// path containing glob metacharacters — notably Next.js catch-all route dirs
// like `[...path]` — is silently skipped. Escape each collected path so it is
// matched literally while leaving ordinary (metacharacter-free) paths intact.
function escapeForTestGlob(filePath) {
  return filePath.replace(/[?*[\]{}]/g, (ch) => `[${ch}]`);
}

const testRoots = [path.join(process.cwd(), "src"), path.join(process.cwd(), "desktop")];
const testFiles = testRoots.flatMap((root) => collectTestFiles(root)).sort();

if (testFiles.length === 0) {
  console.error("No test files found under src/ or desktop/");
  process.exit(1);
}

const escapedTestFiles = testFiles.map(escapeForTestGlob);

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...escapedTestFiles], {
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
