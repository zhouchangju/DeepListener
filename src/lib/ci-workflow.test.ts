/**
 * CI contract guard.
 *
 * CI runs lint, test:ci, and build as three EXPLICIT job steps (not via a
 * single `npm run verify`). This is deliberate: it makes the remote gate
 * readable at a glance, so a reviewer can see exactly what runs on every PR
 * without resolving a script indirection. This test protects that contract by
 * parsing `.github/workflows/ci.yml` with a real YAML parser (js-yaml, already
 * a devDependency) and asserting the three `run:` commands exist as separate
 * steps — so whitespace/key-order reformatting never breaks it.
 *
 * If you ever want to collapse CI into one step, update this test in the same
 * change so the contract shift is explicit.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");

type Step = { name?: string; run?: string };
type Job = { steps?: Step[] };
type Workflow = { jobs?: Record<string, Job> };

test("ci.yml exists", () => {
  assert.equal(existsSync(workflowPath), true, `${workflowPath} must exist`);
});

test("CI runs lint, test:ci, and build as three explicit steps", () => {
  const parsed = yaml.load(readFileSync(workflowPath, "utf8")) as Workflow;
  const jobs = parsed.jobs ?? {};
  const commands: string[] = [];
  for (const job of Object.values(jobs)) {
    for (const step of job.steps ?? []) {
      if (typeof step.run === "string" && step.run.trim()) {
        commands.push(step.run.trim());
      }
    }
  }
  const expected = ["npm run lint", "npm run test:ci", "npm run build"];
  for (const cmd of expected) {
    assert.ok(
      commands.includes(cmd),
      `ci.yml must contain a step running \`${cmd}\`; found: ${JSON.stringify(commands)}`,
    );
  }
  assert.ok(
    commands.length >= 3,
    `ci.yml must keep lint/test/build as separate steps; found ${commands.length} run steps`,
  );
});
