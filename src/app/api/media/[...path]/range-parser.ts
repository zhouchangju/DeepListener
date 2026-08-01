/**
 * HTTP Range header parser (W1 T062, PDR-004).
 *
 * Extracted from the media route so the route file exports ONLY HTTP method
 * handlers (Next.js forbids non-method exports from route.ts).
 */
export interface ByteRange {
  start: number;
  end: number;
}

export type ParsedRange =
  | { kind: "full" | "unsatisfiable"; range?: undefined }
  | { kind: "range"; range: ByteRange };

/**
 * Parse an HTTP `Range: bytes=` header against a known total size.
 * Returns:
 *  - `{ kind: "full" }` when no range header is present.
 *  - `{ kind: "unsatisfiable" }` when the range cannot be served (→ 416).
 *  - `{ kind: "range", start, end }` for a satisfiable byte range.
 */
export function parseRangeHeader(rangeHeader: string | null, totalSize: number): ParsedRange {
  if (!rangeHeader || totalSize <= 0) return { kind: "full" };
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return { kind: "full" }; // Malformed → fall back to full response.
  const [, startRaw, endRaw] = match;

  let start: number;
  let end: number;
  if (startRaw === "") {
    // Suffix range: bytes=-N → last N bytes.
    const suffix = endRaw === "" ? 0 : Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return { kind: "unsatisfiable" };
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === "" ? totalSize - 1 : Number(endRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
      return { kind: "unsatisfiable" };
    }
  }

  if (start >= totalSize || start > end) {
    return { kind: "unsatisfiable" };
  }
  // Clamp end to the last byte (inclusive).
  if (end >= totalSize) end = totalSize - 1;
  return { kind: "range", range: { start, end } };
}
