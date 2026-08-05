import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./DatabaseRecoveryDialog.tsx", import.meta.url), "utf8");

test("database recovery guide uses a wide, scrollable dialog with platform-specific commands", () => {
  assert.match(source, /DialogTrigger/);
  assert.match(source, /sm:max-w-3xl/);
  assert.match(source, /max-h-\[calc\(100vh-2rem\)\]/);
  assert.match(source, /serverMissingWindowsCommand/);
  assert.match(source, /serverMissingWindowsDatabaseCommand/);
  assert.match(source, /serverMissingMacCommand/);
  assert.match(source, /serverMissingMacDatabaseCommand/);
  assert.match(source, /serverMissingMigrateCommand/);
});
