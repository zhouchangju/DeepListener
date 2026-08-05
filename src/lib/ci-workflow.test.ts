import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

test("github actions CI workflow exists and runs the core verification steps", () => {
  const workflowPath = path.join(process.cwd(), ".github", "workflows", "ci.yml");

  assert.equal(existsSync(workflowPath), true, "expected .github/workflows/ci.yml to exist");

  const workflow = readFileSync(workflowPath, "utf8");

  // Git checkout may preserve CRLF on Windows; the workflow contract is about
  // the YAML key, not the repository's newline convention.
  assert.match(workflow, /^on:\r?\n/m);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /node-version:\s*22/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run test:ci/);
  assert.match(workflow, /npm run build/);
});

test("package exposes a shared ci test command", () => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(typeof packageJson.scripts?.["test:ci"], "string");
  assert.match(packageJson.scripts?.["test:ci"] ?? "", /run-node-tests\.mjs/);
});

test("package build script uses the repo build wrapper", () => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(packageJson.scripts?.build, "node scripts/next-build.mjs");
});

test("desktop release scripts expose a fail-closed preflight and explicit alpha escape hatch", () => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const desktopDistPath = path.join(process.cwd(), "scripts", "desktop-dist.mjs");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const desktopDist = readFileSync(desktopDistPath, "utf8");

  assert.equal(packageJson.scripts?.["desktop:preflight"], "node scripts/desktop-preflight.mjs");
  assert.match(desktopDist, /desktop-preflight\.mjs/);
  assert.match(desktopDist, /--allow-system-ffmpeg/);
  assert.match(desktopDist, /--allow-synthetic-demo/);
});

test("legacy DB repair is exposed as an explicit command", () => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  assert.equal(packageJson.scripts?.["db:repair-legacy"], "node scripts/repair-legacy-db.mjs");
});

test("repository uses npm as the single CI package manager", () => {
  assert.equal(existsSync(path.join(process.cwd(), "package-lock.json")), true);
  assert.equal(
    existsSync(path.join(process.cwd(), "pnpm-lock.yaml")),
    false,
    "CI uses npm ci, so a stale pnpm lockfile should not be tracked",
  );
});

test("next build has a wasm swc fallback for restricted local Node runtimes", () => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const buildScriptPath = path.join(process.cwd(), "scripts", "next-build.mjs");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const buildScript = readFileSync(buildScriptPath, "utf8");

  assert.equal(
    packageJson.devDependencies?.["@next/swc-wasm-nodejs"],
    packageJson.dependencies?.next,
  );
  assert.equal(packageJson.devDependencies?.["lightningcss-wasm"], "1.30.2");
  assert.match(buildScript, /NEXT_TEST_WASM_DIR/);
  assert.match(buildScript, /path\.join\(projectRoot, "\.next", "standalone"\)/);
  assert.match(buildScript, /renameSync\(standaloneOutputDir, staleOutputDir\)/);
  assert.match(buildScript, /error\?\.code !== "EXDEV"/);
  assert.match(buildScript, /path\.dirname\(standaloneOutputDir\)/);
  assert.match(buildScript, /rmSync\(staleOutputDir/);
  assert.match(buildScript, /path\.join\(staleOutputDir, "\.DS_Store"\)/);
});

test("custom eslint rules declare direct plugin dependencies", () => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const eslintConfigPath = path.join(process.cwd(), "eslint.config.mjs");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    devDependencies?: Record<string, string>;
  };
  const eslintConfig = readFileSync(eslintConfigPath, "utf8");

  assert.equal(packageJson.devDependencies?.["eslint-plugin-react"], "7.37.5");
  assert.equal(packageJson.devDependencies?.["eslint-plugin-react-hooks"], "7.0.1");
  assert.match(eslintConfig, /eslint-plugin-react/);
  assert.match(eslintConfig, /eslint-plugin-react-hooks/);
});
