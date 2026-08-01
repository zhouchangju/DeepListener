import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { createDisposableDataRoot, prismaFileUrl } from "./data-root-helper.js";

test("createDisposableDataRoot creates the AD-003 layout under the OS temp dir", () => {
  const root = createDisposableDataRoot("deeplistener-w0-test");
  try {
    // Root is under the OS temp dir, never the repo runtime.
    assert.ok(
      root.root.startsWith(tmpdir()),
      `root ${root.root} must live under ${tmpdir()}`,
    );
    // All expected subdirectories exist.
    for (const dir of Object.values(root.dirs)) {
      assert.ok(existsSync(dir), `missing ${dir}`);
      assert.equal(statSync(dir).isDirectory(), true);
    }
    // Database file slot resolves under the database dir.
    assert.ok(root.databaseFile.startsWith(root.dirs.database));
    assert.ok(root.databaseFile.endsWith("deeplistener.db"));
  } finally {
    root.dispose();
  }
});

test("dispose removes the entire data root", () => {
  const root = createDisposableDataRoot("deeplistener-w0-cleanup");
  const path = root.root;
  assert.ok(existsSync(path));
  root.dispose();
  assert.equal(existsSync(path), false);
});

test("prismaFileUrl returns an absolute file: URL", () => {
  const url = prismaFileUrl("/var/folders/x/deeplistener-w0-x/database/deeplistener.db");
  assert.ok(url.startsWith("file:"), `expected file: url, got ${url}`);
  // No relative segment that Prisma would resolve against schema dir.
  assert.ok(!url.startsWith("file:./"), "must not be relative");
});
