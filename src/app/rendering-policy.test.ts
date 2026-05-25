import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DATABASE_BACKED_PAGES = [
  "./dashboard/page.tsx",
  "./vault/page.tsx",
];

for (const pagePath of DATABASE_BACKED_PAGES) {
  test(`${pagePath} is forced dynamic because it reads Prisma data`, () => {
    const source = readFileSync(new URL(pagePath, import.meta.url), "utf8");

    assert.match(
      source,
      /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']|export\s+const\s+revalidate\s*=\s*0/,
      "database-backed pages must opt out of static prerendering"
    );
  });
}
