import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

test("github actions CI workflow exists and runs the core verification steps", () => {
  const workflowPath = path.join(process.cwd(), ".github", "workflows", "ci.yml");

  assert.equal(existsSync(workflowPath), true, "expected .github/workflows/ci.yml to exist");

  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /^on:\n/m);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /npm ci/);
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
