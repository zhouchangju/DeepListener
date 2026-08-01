/**
 * Error thrown by {@link requireOkResponse} when the server returns a non-2xx
 * response. Carries an optional safe `code` (whitelisted by the server — see
 * `internalServerErrorSafe`) so callers can branch on actionable causes such
 * as `TRANSCRIPTION_TIMEOUT` and offer a targeted retry.
 */
export class ApiError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ErrorPayload {
  error?: unknown;
  code?: unknown;
  messageKey?: unknown;
}

async function parseErrorPayload(response: Response): Promise<ErrorPayload> {
  try {
    return (await response.json()) as ErrorPayload;
  } catch {
    return {};
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Ensure a fetch Response is ok; otherwise throw an {@link ApiError} carrying
 * the most useful safe message and code the server was willing to share.
 *
 * Resolution order for the message:
 *   1. server-provided `error` string (already user-facing by convention)
 *   2. the caller's `fallbackMessage`
 *
 * The `code` field passes through when the server whitelisted one (see
 * `internalServerErrorSafe`); callers may switch on it for targeted UX.
 */
export async function requireOkResponse(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const payload = await parseErrorPayload(response);
  const message = isNonEmptyString(payload.error) ? (payload.error as string) : fallbackMessage;
  const code = isNonEmptyString(payload.code) ? (payload.code as string) : undefined;

  throw new ApiError(message, response.status, code);
}
