/**
 * T011 — Package-content audit mutation test.
 *
 * Verify clauses:
 *  - audit passes on a complete synthetic standalone layout
 *  - removing one required asset makes the audit fail
 *
 * This runs entirely against a synthetic fixture built under os.tmpdir(); it
 * never touches .next/standalone produced by a real build (which may be stale
 * or absent in CI).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const audit = join(here, "package-content-audit.mjs");

function buildCompleteStandalone() {
  const root = mkdtempSync(join(tmpdir(), "w0-audit-"));
  mkdirSync(join(root, "node_modules/@prisma/client/runtime"), {
    recursive: true,
  });
  mkdirSync(join(root, "node_modules/.prisma/client"), { recursive: true });
  mkdirSync(join(root, ".next/static"), { recursive: true });
  writeFileSync(join(root, "server.js"), "x".repeat(2000));
  writeFileSync(join(root, "package.json"), "{}");
  writeFileSync(join(root, "node_modules/@prisma/client/default.js"), "// entry");
  writeFileSync(
    join(root, "node_modules/@prisma/client/runtime/library.js"),
    "// runtime",
  );
  writeFileSync(join(root, "node_modules/.prisma/client/index.js"), "// client");
  writeFileSync(
    join(root, "node_modules/.prisma/client/schema.prisma"),
    "generator client {}",
  );
  writeFileSync(
    join(root, "node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node"),
    Buffer.alloc(200000),
  );
  return root;
}

test("audit passes on a complete standalone layout", () => {
  const root = buildCompleteStandalone();
  try {
    execFileSync("node", [audit, root], { stdio: "pipe" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("audit FAILS when the Prisma darwin-arm64 engine is removed", () => {
  const root = buildCompleteStandalone();
  const enginePath = join(
    root,
    "node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node",
  );
  rmSync(enginePath);
  assert.equal(existsSync(enginePath), false);
  let threw = false;
  try {
    execFileSync("node", [audit, root], { stdio: "pipe" });
  } catch (err) {
    threw = true;
    assert.notEqual(err.status, 0, "audit must exit non-zero on missing asset");
    const stderr = err.stderr?.toString() ?? "";
    assert.match(stderr, /MISSING:.*libquery_engine-darwin-arm64/);
  }
  assert.equal(threw, true, "audit must fail when a required asset is missing");
  rmSync(root, { recursive: true, force: true });
});

test("audit FAILS when server.js is too small (truncated bundle)", () => {
  const root = buildCompleteStandalone();
  writeFileSync(join(root, "server.js"), "x"); // 1 byte, below 1000 min
  let threw = false;
  try {
    execFileSync("node", [audit, root], { stdio: "pipe" });
  } catch (err) {
    threw = true;
    assert.notEqual(err.status, 0);
    assert.match(err.stderr?.toString() ?? "", /TOO SMALL: server\.js/);
  }
  assert.equal(threw, true);
  rmSync(root, { recursive: true, force: true });
});
