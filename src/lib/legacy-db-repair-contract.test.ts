import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.join(process.cwd(), "scripts", "repair-legacy-db.mjs"), "utf8");

test("legacy database repair is explicit, dry-run by default, and backs up before writing", () => {
  assert.match(source, /!dbPath \|\| !path\.isAbsolute\(dbPath\)/);
  assert.match(source, /if \(apply && !yes\)/);
  assert.match(source, /DRY RUN: no database changes made/);
  assert.match(source, /copyFileSync\(dbPath, backupPath\)/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS _deeplistener_migrations/);
  assert.match(source, /db\.exec\("BEGIN"\)/);
});
