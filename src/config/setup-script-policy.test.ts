import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("setup script preserves local env files and active sqlite data", () => {
  const setup = readFileSync(path.join(process.cwd(), "bin", "setup"), "utf8");

  assert.doesNotMatch(setup, /touch\s+\.env/);
  assert.doesNotMatch(setup, />>\s*\.env/);
  assert.doesNotMatch(setup, /cp\s+\.env\.example\s+\.env/);
  assert.doesNotMatch(setup, /\[\s+!-?f\s+\.env\s+\]/);
  assert.doesNotMatch(setup, /\[\s+-f\s+dev\.db\s+\]/);
  assert.doesNotMatch(setup, /prisma\s+migrate\s+dev\s+--name\s+init/);
  assert.match(setup, /prisma\/dev\.db/);
  assert.match(setup, /prisma\s+migrate\s+deploy/);
});
