/** Localized message keys for client-side upload validation results. */
export const CLIENT_UPLOAD_VALIDATION_MESSAGE_KEYS = {
  EMPTY_NAME: "uploadErrorEmptyName",
  EMPTY_FILE: "uploadErrorEmptyFile",
  UNSUPPORTED_TYPE: "uploadErrorUnsupportedType",
  AUDIO_TOO_LARGE: "uploadErrorAudioTooLarge",
  VIDEO_TOO_LARGE: "uploadErrorVideoTooLarge",
} as const;

export type ClientUploadValidationMessageKey =
  (typeof CLIENT_UPLOAD_VALIDATION_MESSAGE_KEYS)[keyof typeof CLIENT_UPLOAD_VALIDATION_MESSAGE_KEYS];

export function getClientUploadValidationMessageKey(code?: string): ClientUploadValidationMessageKey {
  if (!code) return "uploadErrorUnsupportedType";
  return CLIENT_UPLOAD_VALIDATION_MESSAGE_KEYS[code as keyof typeof CLIENT_UPLOAD_VALIDATION_MESSAGE_KEYS]
    ?? "uploadErrorUnsupportedType";
}
