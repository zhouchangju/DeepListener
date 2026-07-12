import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("sync backs up the SQLite file that Prisma actually uses", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

  assert.match(packageJson.scripts.sync, /prisma\/dev\.db/);
  assert.doesNotMatch(packageJson.scripts.sync, /(^|[^\w/])dev\.db\s/);
});

test("project docs explain that file:./dev.db resolves under prisma", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  assert.match(read("../../README.md"), /prisma\/dev\.db/);
  assert.match(read("../../AGENTS.md"), /prisma\/dev\.db/);
  assert.match(read("../../docs/maintenance.md"), /prisma\/dev\.db/);
});

test("local SQLite safety backups stay untracked", () => {
  const gitignore = readFileSync(new URL("../../.gitignore", import.meta.url), "utf8");
  assert.match(gitignore, /prisma\/\*\.db\.\*\.backup/);
});
