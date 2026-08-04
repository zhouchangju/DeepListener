import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const layoutSource = readFileSync(
  path.join(process.cwd(), "src", "app", "layout.tsx"),
  "utf8",
);
const globalsSource = readFileSync(
  path.join(process.cwd(), "src", "app", "globals.css"),
  "utf8",
);
const runtimePathsSource = readFileSync(
  path.join(process.cwd(), "src", "lib", "runtime-paths.ts"),
  "utf8",
);
const mediaStorageSource = readFileSync(
  path.join(process.cwd(), "src", "lib", "media-storage.ts"),
  "utf8",
);
const mediaRouteSource = readFileSync(
  path.join(process.cwd(), "src", "app", "api", "media", "[...path]", "route.ts"),
  "utf8",
);

test("production layout has no build-time Google Fonts dependency", () => {
  assert.doesNotMatch(layoutSource, /next\/font\/google/);
  assert.doesNotMatch(layoutSource, /Inter\(/);
  assert.match(globalsSource, /--font-sans:\s*ui-sans-serif, system-ui/);
});

test("runtime media paths are excluded from standalone output tracing", () => {
  assert.match(runtimePathsSource, /path\.resolve\(\/\* turbopackIgnore: true \*\/ dir, relative\)/);
  assert.match(mediaStorageSource, /realpath\(\/\* turbopackIgnore: true \*\/ resolved\.path\)/);
  assert.match(mediaStorageSource, /realpath\(\/\* turbopackIgnore: true \*\/ dir\)/);
  assert.match(mediaRouteSource, /stat\(\/\* turbopackIgnore: true \*\/ resolved\.path\)/);
  assert.match(mediaRouteSource, /createReadStream\(\/\* turbopackIgnore: true \*\/ resolved\.path\)/);
});
