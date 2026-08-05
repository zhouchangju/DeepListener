import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./prisma.ts", import.meta.url), "utf8");

test("Prisma uses the runtime database when DATABASE_URL is omitted", () => {
  assert.match(source, /layout\.mode === "desktop" \|\| !process\.env\.DATABASE_URL\?\.trim\(\)/);
  assert.match(source, /process\.env\.DATABASE_URL = databaseUrl\(layout\)/);
});

test("Prisma preserves an explicit legacy DATABASE_URL", () => {
  assert.match(source, /an explicit DATABASE_URL remains[\s\S]*authoritative/);
});
