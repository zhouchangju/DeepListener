import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hookPath = fileURLToPath(new URL("./deeplistener-quality-gate.mjs", import.meta.url));
const projectRoot = path.resolve(path.dirname(hookPath), "../..");

function runHook(mode, input) {
  const result = spawnSync(process.execPath, [hookPath, mode], {
    cwd: projectRoot,
    input: JSON.stringify({ cwd: projectRoot, ...input }),
    encoding: "utf8",
    env: {
      ...process.env,
      DEEPLISTENER_ROOT: projectRoot,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim() || "{}");
}

test("pre hook allows read-only searches that mention the backup command", () => {
  const backupCommand = ["npm", "run", "sync"].join(" ");
  const payload = runHook("pre", {
    tool_input: { command: `rg -n "${backupCommand}" docs` },
  });

  assert.notEqual(payload.hookSpecificOutput?.permissionDecision, "deny");
});

test("pre hook denies direct backup sync execution", () => {
  const backupCommand = ["npm", "run", "sync"].join(" ");
  const payload = runHook("pre", {
    tool_input: { command: backupCommand },
  });

  assert.equal(payload.hookSpecificOutput?.permissionDecision, "deny");
});

test("quality gate internal commands do not depend on npm or npx being on PATH", () => {
  const source = readFileSync(hookPath, "utf8");
  const runCommandCalls = source
    .match(/runCommand\([\s\S]*?\);/g)
    ?.filter((call) => !call.startsWith("runCommand(label")) ?? [];

  for (const call of runCommandCalls) {
    assert.doesNotMatch(call, /,\s*["']npx["']\s*,/);
    assert.doesNotMatch(call, /,\s*["']npm["']\s*,/);
  }
});
