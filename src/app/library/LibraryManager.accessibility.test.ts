import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/library/LibraryManager.tsx"), "utf8");

test("library date filters have localized accessible names", () => {
  assert.equal((source.match(/aria-label=\{t\("date(?:From|To)"\)\}/g) ?? []).length, 2);
});
