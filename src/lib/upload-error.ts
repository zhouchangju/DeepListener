import type { SafeErrorCode } from "./api-response";

export interface PublicUploadError {
  message: string;
  status: number;
  /** Safe code whitelisted by the server; lets the client tailor retry UX. */
  code?: SafeErrorCode;
}

/**
 * Translate a raw upload/transcription/ffmpeg error into a safe, user-facing
 * message. Never expose raw `error.message` from provider SDKs or the DB layer
 * — only the curated strings below reach the client.
 *
 * Each branch also tags a {@link SafeErrorCode} so the client can switch on the
 * cause (e.g. offer a "retry transcription" action when `PROVIDER_REQUEST_FAILED`).
 */
export function toPublicUploadError(error: unknown): PublicUploadError {
  const message = error instanceof Error ? error.message : "";

  if (/Only audio|File is|File name|File is empty|Unsupported media type|exceeded the allowed size/i.test(message)) {
    return { message, status: 400 };
  }
  if (/API key|api_key|credential|authentication|unauthorized|401|is not set|must be set/i.test(message)) {
    return {
      message: "The selected transcription provider rejected its credentials. Check the provider and key on the Setup page.",
      status: 502,
      code: "PROVIDER_NOT_CONFIGURED",
    };
  }
  if (/ffmpeg|ffprobe|Cannot find ffmpeg|ENOENT/i.test(message)) {
    return {
      message: "FFmpeg is unavailable. Install ffmpeg and ffprobe, then try the media import again.",
      status: 503,
      code: "FFMPEG_NOT_FOUND",
    };
  }
  if (/disk space|ENOSPC|free disk/i.test(message)) {
    return {
      message: "There is not enough free disk space to keep this import safely. Free space, then retry the saved operation.",
      status: 507,
      code: "DISK_INSUFFICIENT",
    };
  }
  if (/timeout|timed out/i.test(message)) {
    return {
      message: "Transcription timed out. Try again, or use a shorter media file.",
      status: 504,
      code: "TRANSCRIPTION_TIMEOUT",
    };
  }
  if (/fetch failed|network|proxy|ECONN|ENOTFOUND|quota|rate\s*limit|too many requests|\b429\b|provider\s+request\s+failed/i.test(message)) {
    return {
      message: "The transcription provider is unavailable or over its quota. Check the provider account, network, or choose another provider.",
      status: 502,
      code: "PROVIDER_REQUEST_FAILED",
    };
  }
  if (/no segments|empty transcript|transcription.*empty/i.test(message)) {
    return {
      message: "The provider returned no usable transcript. Try clearer audio or another transcription provider.",
      status: 422,
      code: "TRANSCRIPTION_NO_SENTENCES",
    };
  }
  return {
    message: "Media import failed. Open Setup to check the database, provider, and media tools, then try again.",
    status: 500,
  };
}
