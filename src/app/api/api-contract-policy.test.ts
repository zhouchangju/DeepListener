import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CONTRACT_ROUTES = [
  "./review/log/route.ts",
  "./vault/export/route.ts",
  "./library/export/route.ts",
  "./audio/export/route.ts",
];

for (const routePath of CONTRACT_ROUTES) {
  test(`${routePath} uses shared api schema parsing`, () => {
    const source = readFileSync(new URL(routePath, import.meta.url), "utf8");

    assert.match(source, /safeParse\(/);
    assert.doesNotMatch(source, /const\s+\{[^}]+\}\s*=\s*await\s+req\.json\(\)/);
  });
}

test("archive route uses shared response helper", () => {
  const source = readFileSync(new URL("./vault/[id]/archive/route.ts", import.meta.url), "utf8");

  assert.match(source, /notFound\(/);
  assert.match(source, /internalServerError\(/);
  assert.doesNotMatch(source, /new Response\(\s*JSON\.stringify/);
});
