import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (/\.test\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const testRoot = path.join(process.cwd(), "src");
const testFiles = collectTestFiles(testRoot).sort();

if (testFiles.length === 0) {
  console.error("No test files found under src/");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...testFiles], {
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
