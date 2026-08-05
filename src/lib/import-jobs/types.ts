import type { UploadMediaKind } from "@/lib/upload-policy";
import type { ProviderId } from "@/lib/secrets-store";

export const IMPORT_JOB_VERSION = 1;

export type ImportJobStatus =
  | "RECEIVING"
  | "READY"
  | "TRANSCRIBING"
  | "ACTIVATING"
  | "FAILED"
  | "ACTIVATED"
  | "CANCELED";

export type ImportJobErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_REQUEST_FAILED"
  | "TRANSCRIPTION_TIMEOUT"
  | "TRANSCRIPTION_NO_SENTENCES"
  | "FFMPEG_NOT_FOUND"
  | "MEDIA_DECODE_FAILED"
  | "SUBTITLE_INVALID"
  | "SUBTITLE_MISMATCH"
  | "DISK_INSUFFICIENT"
  | "IMPORT_FAILED";

export interface ImportJobError {
  code: ImportJobErrorCode;
  message: string;
  occurredAt: string;
}

export type ImportAttemptStatus = "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT";

/** Safe, non-secret metadata for fencing provider retries and late results. */
export interface ImportJobAttempt {
  id: string;
  provider: ProviderId;
  status: ImportAttemptStatus;
  startedAt: string;
  finishedAt?: string;
}

export interface ImportArtifact {
  kind: "source" | "derived-audio" | "subtitle";
  storageKey: string;
  bytes?: number;
  sha256?: string;
  originalName?: string;
}

export interface ImportJobManifest {
  version: number;
  id: string;
  status: ImportJobStatus;
  mediaKind: UploadMediaKind;
  displayName: string;
  originalName: string;
  createdAt: string;
  updatedAt: string;
  phase: "received" | "subtitle-ready" | "transcribing" | "activating" | "complete" | "failed" | "canceled";
  artifacts: ImportArtifact[];
  provider?: ProviderId;
  attempt?: ImportJobAttempt;
  error?: ImportJobError;
  trackId?: string;
  title?: string;
  subtitleFormat?: "srt" | "vtt";
  /** Safe, non-secret summary for the recovery UI. */
  estimatedBytes?: number;
}

export interface PublicImportJob {
  id: string;
  status: ImportJobStatus;
  mediaKind: UploadMediaKind;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  phase: ImportJobManifest["phase"];
  provider?: ProviderId;
  error?: ImportJobError;
  trackId?: string;
  hasSubtitle: boolean;
  estimatedBytes?: number;
}
