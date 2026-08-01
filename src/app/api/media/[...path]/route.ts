import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolveExistingMedia, type ResolvedMedia } from "@/lib/media-storage";
import { resolveLayout, type RuntimeLayout } from "@/lib/runtime-paths";
import { parseRangeHeader } from "./range-parser";

/**
 * Byte-range media streaming route (W1 T062 / W2 T120-T121, PDR-004).
 *
 * Serves stored audio/video with correct HTTP range semantics without buffering
 * the complete file. This is the Desktop playback path: it resolves the stored
 * `/uploads/<f>` or `/videos/<f>` identifier to the active data-root media dir
 * via runtime-paths, so the same DB record plays in both Server (legacy) and
 * Desktop (explicit root) modes. The legacy `/uploads/` and `/videos/` static
 * serving continues to work for Server.
 *
 * Security (PDR-003): traversal and symlink escape are rejected with a generic
 * 404 that reveals no path detail. MIME comes from the validated extension in
 * media-storage, never from request input.
 */

export const dynamic = "force-dynamic";

/** Build the response headers common to 200/206 responses (no body bytes). */
function buildBaseHeaders(resolved: ResolvedMedia & { ok: true }, acceptRanges: boolean) {
  return {
    "Content-Type": resolved.mime,
    "Accept-Ranges": acceptRanges ? "bytes" : "none",
    "Cache-Control": "no-store",
  };
}

/** Convert a Node readable into a Web ReadableStream<Uint8Array> for the Response body. */
function nodeStreamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;
}

/**
 * Resolve the stored-media identifier carried by the catch-all path segments
 * into a validated, existing media file. The identifier is reconstructed as
 * `uploads/<segments>` or `videos/<segments>` (without a leading slash, which
 * resolveStoredMediaPath accepts). On any failure returns null → caller emits 404.
 */
async function resolveFromSegments(
  segments: string[],
  layout: RuntimeLayout,
): Promise<(ResolvedMedia & { ok: true }) | null> {
  if (!segments.length) return null;
  const [head, ...rest] = segments;
  if (head !== "uploads" && head !== "videos") return null;
  if (rest.length === 0) return null;
  const storedUrl = `${head}/${rest.join("/")}`;
  const resolved = await resolveExistingMedia(storedUrl, layout);
  if (!resolved.ok) return null;
  return resolved;
}

interface MediaRouteContext {
  params: Promise<{ path: string[] }>;
}

async function serveMedia(
  req: NextRequest,
  context: MediaRouteContext,
  includeBody: boolean,
): Promise<Response> {
  const layout = resolveLayout();
  const { path: segments } = await context.params;
  const resolved = await resolveFromSegments(segments, layout);
  if (!resolved) {
    // Generic 404 — never reveal whether the path was malformed vs. missing.
    return new NextResponse(null, { status: 404 });
  }

  let size: number;
  try {
    size = (await stat(resolved.path)).size;
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const parsed = parseRangeHeader(req.headers.get("range"), size);

  if (parsed.kind === "unsatisfiable") {
    return new NextResponse(null, {
      status: 416,
      headers: {
        ...buildBaseHeaders(resolved, true),
        "Content-Range": `bytes */${size}`,
        "Content-Length": "0",
      },
    });
  }

  if (parsed.kind === "range") {
    const { start, end } = parsed.range;
    const contentLength = end - start + 1;
    const headers = new Headers(buildBaseHeaders(resolved, true));
    headers.set("Content-Length", String(contentLength));
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    if (!includeBody) {
      return new NextResponse(null, { status: 206, headers });
    }
    const nodeStream = createReadStream(resolved.path, { start, end });
    return new NextResponse(nodeStreamToWeb(nodeStream), { status: 206, headers });
  }

  // Full response (200).
  const headers = new Headers(buildBaseHeaders(resolved, true));
  headers.set("Content-Length", String(size));
  if (!includeBody) {
    return new NextResponse(null, { status: 200, headers });
  }
  const nodeStream = createReadStream(resolved.path);
  return new NextResponse(nodeStreamToWeb(nodeStream), { status: 200, headers });
}

export async function GET(req: NextRequest, context: MediaRouteContext): Promise<Response> {
  return serveMedia(req, context, true);
}

export async function HEAD(req: NextRequest, context: MediaRouteContext): Promise<Response> {
  return serveMedia(req, context, false);
}
