import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

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

test("api routes do not expose raw exception messages in 500 responses", () => {
  const routePaths = findRouteFiles(path.dirname(new URL(import.meta.url).pathname));

  for (const routePath of routePaths) {
    const source = readFileSync(routePath, "utf8");

    assert.doesNotMatch(
      source,
      /const\s+message\s*=\s*error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*["']Unknown error["'];[\s\S]{0,240}NextResponse\.json\(\s*\{\s*error:\s*message\s*\}\s*,\s*\{\s*status:\s*500\s*\}/,
      `${routePath} should use the shared internalServerError helper`,
    );
  }
});

function findRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (entry === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}
