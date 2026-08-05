import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/vault/ExportButtons.tsx"), "utf8");

test("date filter clear control has an accessible localized name", () => {
  assert.match(source, /aria-label=\{t\("dateFrom"\)\}/);
  assert.match(source, /aria-label=\{t\("dateTo"\)\}/);
  assert.match(source, /title=\{t\("clearDateFilter"\)\}[\s\S]*aria-label=\{t\("clearDateFilter"\)\}/);
});
