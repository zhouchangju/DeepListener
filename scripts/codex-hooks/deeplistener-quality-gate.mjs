#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = path.resolve(
  process.env.DEEPLISTENER_ROOT || "/Users/leozhou/git/DeepListener",
);
const mode = process.argv[2] || "stop";
const outputLineLimit = Number(process.env.DEEPLISTENER_HOOK_OUTPUT_LINES || 80);

function emit(payload = {}) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function readHookInput() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function normalizeSlash(value) {
  return value.split(path.sep).join("/");
}

function resolveFromProject(value) {
  if (!value) {
    return null;
  }

  return path.isAbsolute(value)
    ? path.resolve(value)
    : path.resolve(PROJECT_ROOT, value);
}

function isInsideProject(value) {
  const absolute = path.resolve(value);
  return absolute === PROJECT_ROOT || absolute.startsWith(`${PROJECT_ROOT}${path.sep}`);
}

function isProjectInvocation(input) {
  const cwd = path.resolve(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  return isInsideProject(cwd);
}

function relativeProjectPath(value) {
  const absolute = resolveFromProject(value);
  if (!absolute || !isInsideProject(absolute)) {
    return null;
  }

  return normalizeSlash(path.relative(PROJECT_ROOT, absolute));
}

function isGeneratedPath(relPath) {
  return (
    relPath.startsWith(".next/") ||
    relPath.startsWith(".worktrees/") ||
    relPath.includes("/.next/") ||
    relPath.startsWith("node_modules/") ||
    relPath.startsWith("out/") ||
    relPath.startsWith("build/")
  );
}

function isSourceScript(relPath) {
  return (
    /^(src|scripts)\//.test(relPath) &&
    /\.(cjs|mjs|js|jsx|ts|tsx)$/.test(relPath) &&
    !isGeneratedPath(relPath)
  );
}

function isTypeScriptSource(relPath) {
  return isSourceScript(relPath) && /\.tsx?$/.test(relPath);
}

function isSensitiveEnvPath(relPath) {
  return /(^|\/)\.env($|[.\w-])/.test(relPath);
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function commandFromInput(input) {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== "object") {
    return "";
  }

  return String(toolInput.command || toolInput.cmd || "");
}

function denyToolUse(message) {
  emit({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: message,
    },
    systemMessage: message,
  });
}

function allowWithUpdatedInput(message, updatedInput) {
  emit({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: message,
      updatedInput,
    },
    systemMessage: message,
  });
}

function parsePatchPaths(text) {
  const paths = [];
  const pattern = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm;
  let match = pattern.exec(text);

  while (match) {
    paths.push(match[1].trim());
    match = pattern.exec(text);
  }

  return paths;
}

function extractTouchedPaths(input) {
  const toolInput = input.tool_input;
  const paths = [];

  if (toolInput && typeof toolInput === "object") {
    for (const key of ["file_path", "path", "file"]) {
      if (typeof toolInput[key] === "string") {
        paths.push(toolInput[key]);
      }
    }

    for (const key of ["patch", "content", "cmd", "command"]) {
      if (typeof toolInput[key] === "string" && toolInput[key].includes("*** Begin Patch")) {
        paths.push(...parsePatchPaths(toolInput[key]));
      }
    }
  } else if (typeof toolInput === "string") {
    paths.push(...parsePatchPaths(toolInput));
  }

  return [...new Set(paths.map(relativeProjectPath).filter(Boolean))];
}

function runCommand(label, command, args, timeoutMs) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    timeout: timeoutMs,
  });

  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, outputLineLimit)
    .join("\n");

  if (result.error) {
    return {
      ok: false,
      label,
      output: `${result.error.name}: ${result.error.message}`,
    };
  }

  if (result.signal) {
    return {
      ok: false,
      label,
      output: `Command terminated by ${result.signal}`,
    };
  }

  return {
    ok: result.status === 0,
    label,
    output,
  };
}

function handlePreToolUse(input) {
  const command = commandFromInput(input);
  const touchedPaths = extractTouchedPaths(input);

  if (touchedPaths.some(isSensitiveEnvPath)) {
    denyToolUse(
      "DeepListener guard blocked editing `.env*` or another local environment file. Ask the user to change secrets locally.",
    );
    return;
  }

  if (!command) {
    emit();
    return;
  }

  if (/\brm\s+-[^\n;&|]*[rf][^\n;&|]*[rf]/i.test(command)) {
    denyToolUse("DeepListener guard blocked `rm -rf`. Use a safer, explicit cleanup plan.");
    return;
  }

  if (/\bgit\s+push\b[^\n]*--force(?:-with-lease)?\b/i.test(command)) {
    denyToolUse("DeepListener guard blocked force-push. Do not overwrite shared history.");
    return;
  }

  if (/\bnpm\s+run\s+sync\b/.test(command) && process.env.DEEPLISTENER_ALLOW_SYNC !== "1") {
    denyToolUse(
      "DeepListener guard blocked `npm run sync` because it writes to the remote backup target. Set DEEPLISTENER_ALLOW_SYNC=1 only after explicit user approval.",
    );
    return;
  }

  if (
    /(^|[;&|]\s*)(echo|printf|cat|tee|sed)\b[\s\S]*(>|-i\b|\.env)/i.test(command) &&
    /\.env(?:$|[.\w-])/i.test(command)
  ) {
    denyToolUse("DeepListener guard blocked a shell command that appears to write `.env*`.");
    return;
  }

  const catLogMatch = command.match(/^\s*cat\s+(.+?log[^;&|<>]*)\s*$/i);
  if (catLogMatch) {
    const rawPath = catLogMatch[1].trim().replace(/^['"]|['"]$/g, "");
    const replacement = `rg -n "ERROR|WARN" ${shellQuote(rawPath)} | head -50`;
    allowWithUpdatedInput(
      "DeepListener guard rewrote a broad log read to an ERROR/WARN scan capped at 50 lines.",
      { ...input.tool_input, command: replacement },
    );
    return;
  }

  emit();
}

function handlePostToolUse(input) {
  const touchedPaths = extractTouchedPaths(input).filter(isSourceScript);
  if (touchedPaths.length === 0) {
    emit();
    return;
  }

  const failures = [];

  for (const relPath of touchedPaths) {
    const lint = runCommand(
      `eslint --fix ${relPath}`,
      "npx",
      ["--no-install", "eslint", "--fix", relPath],
      120_000,
    );
    if (!lint.ok) {
      failures.push(lint);
    }
  }

  if (touchedPaths.some(isTypeScriptSource)) {
    const typecheck = runCommand(
      "tsc --noEmit",
      "npx",
      ["--no-install", "tsc", "--noEmit", "--pretty", "false"],
      180_000,
    );
    if (!typecheck.ok) {
      failures.push(typecheck);
    }
  }

  if (failures.length === 0) {
    emit();
    return;
  }

  const summary = failures
    .map((failure) => `## ${failure.label}\n${failure.output || "(no output)"}`)
    .join("\n\n");

  emit({
    systemMessage: `DeepListener PostToolUse quality check found problems:\n${summary}`,
  });
}

function changedFiles() {
  const result = spawnSync("git", ["status", "--porcelain=v1"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((line) => (line.includes(" -> ") ? line.split(" -> ").at(-1) : line))
    .map(normalizeSlash);
}

function shouldRunStopGate(files) {
  return files.some((file) =>
    /^(src|scripts|prisma|package\.json|package-lock\.json|tsconfig\.json|eslint\.config\.mjs|next\.config\.)/.test(
      file,
    ),
  );
}

function handleStop(input) {
  if (process.env.DEEPLISTENER_STOP_GATE === "0" || input.stop_hook_active === true) {
    emit();
    return;
  }

  const files = changedFiles().filter((file) => !isGeneratedPath(file));
  if (!shouldRunStopGate(files)) {
    emit();
    return;
  }

  const checks = [
    runCommand(
      "eslint src scripts --max-warnings=0",
      "npx",
      ["--no-install", "eslint", "src", "scripts", "--max-warnings=0"],
      180_000,
    ),
    runCommand(
      "tsc --noEmit",
      "npx",
      ["--no-install", "tsc", "--noEmit", "--pretty", "false"],
      180_000,
    ),
    runCommand("npm run test:ci", "npm", ["run", "test:ci"], 180_000),
    runCommand("npm run build", "npm", ["run", "build"], 600_000),
  ];

  const failures = checks.filter((check) => !check.ok);
  if (failures.length === 0) {
    emit();
    return;
  }

  const detail = failures
    .map((failure) => `## ${failure.label}\n${failure.output || "(no output)"}`)
    .join("\n\n");
  const message = `DeepListener Stop quality gate failed. Fix these before claiming completion:\n${detail}`;

  emit({
    decision: "block",
    reason: message,
    systemMessage: message,
  });
}

try {
  const input = readHookInput();
  if (!isProjectInvocation(input)) {
    emit();
  } else if (mode === "pre") {
    handlePreToolUse(input);
  } else if (mode === "post") {
    handlePostToolUse(input);
  } else if (mode === "stop") {
    handleStop(input);
  } else {
    emit({ systemMessage: `Unknown DeepListener hook mode: ${mode}` });
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  emit({ systemMessage: `DeepListener hook skipped after error: ${message}` });
}
