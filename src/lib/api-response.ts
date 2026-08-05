import { NextResponse } from "next/server";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function badRequest(error: string) {
  return jsonError(error, 400);
}

export function notFound(error: string) {
  return jsonError(error, 404);
}

export function internalServerError() {
  return jsonError("Internal server error", 500);
}

/**
 * Whitelist of safe, user-facing error codes that API routes may pass through
 * to the client. Anything else is collapsed to a generic message so we never
 * leak internal details (stack traces, SQL, file paths, env values).
 *
 * Keep this list small and explicit — do NOT add a catch-all here.
 */
export const SAFE_ERROR_CODES = [
  "TRANSCRIPTION_TIMEOUT",
  "TRANSCRIPTION_FAILED",
  "TRANSCRIPTION_NO_SENTENCES",
  "PROVIDER_NOT_CONFIGURED",
  "PROVIDER_REQUEST_FAILED",
  "MEDIA_FETCH_FAILED",
  "MEDIA_DECODE_FAILED",
  "FFMPEG_FAILED",
  "FFMPEG_NOT_FOUND",
  "DISK_INSUFFICIENT",
  "EXPORT_EMPTY",
  "EXPORT_TOO_LARGE",
  "DB_CONSTRAINT",
  "DATABASE_NOT_READY",
  "NOT_FOUND",
  "CONFLICT",
] as const;

export type SafeErrorCode = (typeof SAFE_ERROR_CODES)[number];

const SAFE_ERROR_CODE_SET: ReadonlySet<string> = new Set(SAFE_ERROR_CODES);

interface SafeErrorOptions {
  /** A safe code from SAFE_ERROR_CODES. Unknown codes are ignored. */
  code?: SafeErrorCode;
  /** Optional localized message key the client may use; falls back to fallbackMessage. */
  messageKey?: string;
}

/**
 * Build a 500 response that carries only safe, whitelisted context.
 *
 * Why: the old `internalServerError()` collapsed every failure to a generic
 * string, so users saw "Operation failed" even for actionable causes (e.g.
 * transcription timeout). This helper lets a route tag the failure with a
 * safe code when it knows the cause, while still refusing to forward raw
 * error.message / stack / internals for unknown failures.
 */
export function internalServerErrorSafe(options: SafeErrorOptions = {}) {
  const { code, messageKey } = options;
  const safeCode = code && SAFE_ERROR_CODE_SET.has(code) ? code : undefined;
  return NextResponse.json(
    { error: "Internal server error", ...(safeCode ? { code: safeCode } : {}), ...(messageKey ? { messageKey } : {}) },
    { status: 500 },
  );
}

/**
 * Inspect a caught error and return the safest useful response. Routes that
 * catch `unknown` should prefer this over `internalServerError()` so known
 * operational failures surface a code the client can act on.
 */
export function internalServerErrorFrom(error: unknown, knownCode?: SafeErrorCode) {
  // Log the real error server-side for debugging — never echo it to the client.
  const category = error instanceof Error ? error.name : typeof error;
  console.error("[api] request failed:", category);
  return internalServerErrorSafe({ code: knownCode });
}
