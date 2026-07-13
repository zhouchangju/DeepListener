import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("sync backs up the SQLite file that Prisma actually uses", () => {
  // The sync logic lives in scripts/sync-uploads-and-db.sh (invoked from the
  // package.json "sync" script). The invariant is that it syncs prisma/dev.db
  // and does not sync the repo-root dev.db as a standalone file.
  const syncScript = readFileSync(new URL("../../scripts/sync-uploads-and-db.sh", import.meta.url), "utf8");

  assert.match(syncScript, /prisma\/dev\.db/);
  // The script must not treat the repo-root dev.db as the sync source.
  assert.doesNotMatch(syncScript, /(^|[^\w/])dev\.db\s/);
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
