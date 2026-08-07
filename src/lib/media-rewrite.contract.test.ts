import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../../next.config";

/**
 * Contract for the /uploads and /videos playback path.
 *
 * Next.js production scans the public folder once at server startup and serves
 * only that frozen list, so media imported at runtime (public/uploads in
 * legacy mode, and anything in the desktop data root) would 404. The
 * beforeFiles rewrites route these URLs through /api/media, which resolves
 * them via runtime-paths and streams with range support. Guard the mapping so
 * a config refactor cannot silently reintroduce the production-only 404.
 */
test("next.config rewrites stored media URLs through /api/media beforeFiles", async () => {
  assert.equal(typeof nextConfig.rewrites, "function");
  const rewrites = await nextConfig.rewrites!();
  const beforeFiles = (rewrites as { beforeFiles?: { source: string; destination: string }[] })
    .beforeFiles;
  assert.ok(Array.isArray(beforeFiles), "expected beforeFiles rewrites");
  assert.deepEqual(beforeFiles, [
    { source: "/uploads/:path*", destination: "/api/media/uploads/:path*" },
    { source: "/videos/:path*", destination: "/api/media/videos/:path*" },
  ]);
});
