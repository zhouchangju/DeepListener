import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { GET, HEAD } from "./route";
import { parseRangeHeader } from "./range-parser";

/**
 * Byte-range media route tests (PDR-004 / PDR-003).
 *
 * Uses a disposable mktemp data root bound via DEEPLISTENER_DATA_DIR so the
 * route resolves media under <root>/media/{audio,video}. No real uploads,
 * videos, or dev.db are touched.
 */

const ORIGINAL_ENV = { ...process.env };
let dataRoot: string;
const FILE_BYTES = Buffer.from("0123456789abcdef0123456789abcdef", "utf8"); // 32 bytes

before(() => {
  dataRoot = mkdtempSync(join(tmpdir(), "deeplistener-media-route-"));
  const audioDir = join(dataRoot, "media", "audio");
  const videoDir = join(dataRoot, "media", "video");
  mkdirSync(audioDir, { recursive: true });
  mkdirSync(videoDir, { recursive: true });
  writeFileSync(join(audioDir, "clip.mp3"), FILE_BYTES);
  writeFileSync(join(videoDir, "scene.mp4"), FILE_BYTES);
  process.env.DEEPLISTENER_DATA_DIR = dataRoot;
});

after(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
  if (dataRoot) {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

function request(pathSegments: string[], range?: string, method: "GET" | "HEAD" = "GET") {
  const url = `http://localhost/api/media/${pathSegments.join("/")}`;
  const init = range === undefined ? { method } : { method, headers: { range } };
  return {
    req: new NextRequest(url, init),
    context: { params: Promise.resolve({ path: pathSegments }) },
  };
}

function createDirectoryLink(target: string, linkPath: string): boolean {
  try {
    // Directory junctions work on Windows without Developer Mode/admin
    // symlink privileges; POSIX uses a normal directory symlink.
    symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (process.platform === "win32" && (code === "EPERM" || code === "EACCES")) {
      return false;
    }
    throw error;
  }
}

async function collectBody(res: Response): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

test("parseRangeHeader: no header → full", () => {
  assert.equal(parseRangeHeader(null, 100).kind, "full");
  assert.equal(parseRangeHeader("", 100).kind, "full");
});

test("parseRangeHeader: satisfiable range", () => {
  const r = parseRangeHeader("bytes=0-9", 100);
  assert.equal(r.kind, "range");
  if (r.kind === "range") {
    assert.equal(r.range.start, 0);
    assert.equal(r.range.end, 9);
  }
});

test("parseRangeHeader: open-ended range clamps end to last byte", () => {
  const r = parseRangeHeader("bytes=10-", 100);
  assert.equal(r.kind, "range");
  if (r.kind === "range") {
    assert.equal(r.range.start, 10);
    assert.equal(r.range.end, 99);
  }
});

test("parseRangeHeader: suffix range returns last N bytes", () => {
  const r = parseRangeHeader("bytes=-5", 100);
  assert.equal(r.kind, "range");
  if (r.kind === "range") {
    assert.equal(r.range.start, 95);
    assert.equal(r.range.end, 99);
  }
});

test("parseRangeHeader: start beyond size → unsatisfiable", () => {
  assert.equal(parseRangeHeader("bytes=200-300", 100).kind, "unsatisfiable");
});

test("GET with no Range → 200 + full body + Content-Length", async () => {
  const { req, context } = request(["uploads", "clip.mp3"]);
  const res = await GET(req, context);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(res.headers.get("Accept-Ranges"), "bytes");
  assert.equal(res.headers.get("Content-Length"), String(FILE_BYTES.length));
  const body = await collectBody(res);
  assert.equal(body.length, FILE_BYTES.length);
  assert.deepEqual(body, FILE_BYTES);
});

test("GET with satisfiable Range → 206 + Content-Range + partial body", async () => {
  const { req, context } = request(["uploads", "clip.mp3"], "bytes=0-3");
  const res = await GET(req, context);
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("Content-Range"), `bytes 0-3/${FILE_BYTES.length}`);
  assert.equal(res.headers.get("Content-Length"), "4");
  assert.equal(res.headers.get("Accept-Ranges"), "bytes");
  const body = await collectBody(res);
  assert.equal(body.length, 4);
  assert.deepEqual(body, FILE_BYTES.subarray(0, 4));
});

test("GET with suffix range returns the last bytes", async () => {
  const { req, context } = request(["uploads", "clip.mp3"], "bytes=-4");
  const res = await GET(req, context);
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("Content-Length"), "4");
  const body = await collectBody(res);
  assert.deepEqual(body, FILE_BYTES.subarray(FILE_BYTES.length - 4));
});

test("GET with open-ended range streams to end of file", async () => {
  const { req, context } = request(["uploads", "clip.mp3"], "bytes=28-");
  const res = await GET(req, context);
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("Content-Range"), `bytes 28-31/32`);
  assert.equal(res.headers.get("Content-Length"), "4");
  const body = await collectBody(res);
  assert.deepEqual(body, FILE_BYTES.subarray(28));
});

test("GET with range start beyond size → 416 + Content-Range */size", async () => {
  const { req, context } = request(["uploads", "clip.mp3"], `bytes=${FILE_BYTES.length}-`);
  const res = await GET(req, context);
  assert.equal(res.status, 416);
  assert.equal(res.headers.get("Content-Range"), `bytes */${FILE_BYTES.length}`);
});

test("GET serves video MIME for /videos identifier", async () => {
  const { req, context } = request(["videos", "scene.mp4"]);
  const res = await GET(req, context);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "video/mp4");
});

test("HEAD returns headers only (no body) with correct length", async () => {
  const { req, context } = request(["uploads", "clip.mp3"], undefined, "HEAD");
  const res = await HEAD(req, context);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(res.headers.get("Content-Length"), String(FILE_BYTES.length));
  // HEAD must not stream a body.
  assert.equal(res.body, null);
});

test("HEAD with range returns 206 headers without body", async () => {
  const { req, context } = request(["uploads", "clip.mp3"], "bytes=0-3", "HEAD");
  const res = await HEAD(req, context);
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("Content-Length"), "4");
  assert.equal(res.body, null);
});

test("traversal in path → 404 with no Content-Type leak", async () => {
  const { req, context } = request(["uploads", "..", "..", "etc", "passwd"]);
  const res = await GET(req, context);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("Content-Type"), null);
});

test("unknown media prefix → 404", async () => {
  const { req, context } = request(["exports", "something.mp3"]);
  const res = await GET(req, context);
  assert.equal(res.status, 404);
});

test("missing file → 404 (no path detail leaked)", async () => {
  const { req, context } = request(["uploads", "does-not-exist.mp3"]);
  const res = await GET(req, context);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("Content-Type"), null);
});

test("symlink that escapes the media dir → 404 (PDR-003)", async (t) => {
  // Plant a secret outside the media dir and a directory link inside pointing
  // to it. The junction form keeps this security test runnable on Windows.
  const outsideDir = join(dataRoot, "outside");
  mkdirSync(outsideDir, { recursive: true });
  writeFileSync(join(outsideDir, "secret.mp3"), "top-secret");
  if (!createDirectoryLink(outsideDir, join(dataRoot, "media", "audio", "escape"))) {
    t.skip("Windows symlink/junction creation is unavailable in this environment");
    return;
  }
  const { req, context } = request(["uploads", "escape", "secret.mp3"]);
  const res = await GET(req, context);
  assert.equal(res.status, 404);
});
