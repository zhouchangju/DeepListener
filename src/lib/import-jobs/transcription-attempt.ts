import { randomUUID } from "node:crypto";
import type { ProviderId } from "@/lib/secrets-store";
import type { ImportAttemptStatus, ImportJobAttempt, ImportJobManifest } from "./types";

export function beginTranscriptionAttempt(
  provider: ProviderId,
  now = new Date().toISOString(),
): ImportJobAttempt {
  return {
    id: randomUUID(),
    provider,
    status: "RUNNING",
    startedAt: now,
  };
}

/**
 * Complete only the currently-owned attempt. A late response from an older
 * provider call receives the unchanged manifest and cannot overwrite a newer
 * retry attempt.
 */
export function finishTranscriptionAttempt(
  manifest: ImportJobManifest,
  attemptId: string,
  status: Exclude<ImportAttemptStatus, "RUNNING">,
  now = new Date().toISOString(),
): ImportJobManifest {
  if (manifest.attempt?.id !== attemptId) return manifest;
  return {
    ...manifest,
    attempt: {
      ...manifest.attempt,
      status,
      finishedAt: now,
    },
  };
}

export function ownsTranscriptionAttempt(manifest: ImportJobManifest, attemptId: string): boolean {
  return manifest.attempt?.id === attemptId && manifest.attempt.status === "RUNNING";
}
