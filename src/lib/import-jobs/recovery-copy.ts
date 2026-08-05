/**
 * Map persisted import-job error codes to learner-facing translation keys.
 *
 * The manifest keeps a safe server-side message for diagnostics and recovery,
 * but the first-session UI should not render that message verbatim: it may be
 * in English, mention implementation details, or change as the server evolves.
 */
export const RECOVERY_ERROR_MESSAGE_KEYS = {
  PROVIDER_NOT_CONFIGURED: "recoveryErrorProviderNotConfigured",
  PROVIDER_REQUEST_FAILED: "recoveryErrorProviderRequestFailed",
  TRANSCRIPTION_TIMEOUT: "recoveryErrorTranscriptionTimeout",
  TRANSCRIPTION_NO_SENTENCES: "recoveryErrorNoSentences",
  FFMPEG_NOT_FOUND: "recoveryErrorMediaTools",
  MEDIA_DECODE_FAILED: "recoveryErrorMediaDecode",
  SUBTITLE_INVALID: "recoveryErrorSubtitleInvalid",
  SUBTITLE_MISMATCH: "recoveryErrorSubtitleMismatch",
  DISK_INSUFFICIENT: "recoveryErrorDiskSpace",
  IMPORT_FAILED: "recoveryErrorGeneric",
} as const;

export type RecoveryErrorMessageKey =
  (typeof RECOVERY_ERROR_MESSAGE_KEYS)[keyof typeof RECOVERY_ERROR_MESSAGE_KEYS];

export function getRecoveryErrorMessageKey(code?: string): RecoveryErrorMessageKey {
  if (!code) return "recoveryErrorGeneric";
  return RECOVERY_ERROR_MESSAGE_KEYS[code as keyof typeof RECOVERY_ERROR_MESSAGE_KEYS]
    ?? "recoveryErrorGeneric";
}
