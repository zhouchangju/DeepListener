import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serviceWorkerSource = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);

test("app static assets prefer fresh styles while retaining an offline fallback", () => {
  assert.match(serviceWorkerSource, /const SHELL_CACHE_VERSION = "v2"/);
  assert.match(serviceWorkerSource, /const MEDIA_CACHE_VERSION = "v1"/);
  assert.match(
    serviceWorkerSource,
    /const APP_STATIC_PATH_PREFIXES = \["\/_next\/static\/"\]/,
  );
  assert.match(
    serviceWorkerSource,
    /if \(APP_STATIC_PATH_PREFIXES[\s\S]*?\) \{\s*event\.respondWith\(networkFirstWithCacheFallback\(request, SHELL_CACHE\)\)/,
  );
  assert.doesNotMatch(
    serviceWorkerSource,
    /if \(APP_STATIC_PATH_PREFIXES[\s\S]*?\) \{\s*event\.respondWith\(cacheFirst\(request, MEDIA_CACHE\)\)/,
  );
});
