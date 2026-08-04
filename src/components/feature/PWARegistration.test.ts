import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PWARegistration.tsx", import.meta.url), "utf8");

test("Electron unregisters stale service workers and clears only DeepListener caches", () => {
  assert.match(source, /navigator\.serviceWorker\s*\.getRegistrations\(\)/);
  assert.match(source, /registration\.unregister\(\)/);
  assert.match(source, /key\.startsWith\("deeplistener-"\)/);
  assert.match(source, /window\.caches\.delete\(key\)/);
  assert.match(source, /bridge\.onExternalBlocked/);
  assert.match(source, /toast\.warning/);
  assert.match(source, /return \(\) => unsubscribe\?\.\(\)/);
});

test("web mode still registers the PWA service worker", () => {
  assert.match(source, /\.register\("\/sw\.js"\)/);
});
