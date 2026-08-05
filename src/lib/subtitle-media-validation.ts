import type { TranscriptionSegment } from "./transcription/types";

/** A media-duration check is advisory when the probe cannot provide a duration. */
export type SubtitleMediaValidationLevel = "ok" | "warning" | "block";

export type SubtitleMediaValidationReason =
  | "empty"
  | "negative-time"
  | "invalid-range"
  | "outside-media"
  | "duration-unavailable"
  | "near-media-end";

export interface SubtitleMediaValidationResult {
  level: SubtitleMediaValidationLevel;
  ok: boolean;
  reason?: SubtitleMediaValidationReason;
  lastCueEnd?: number;
  toleranceSeconds?: number;
}

/**
 * Keep a small, pure contract for pairing timed text with local media.
 *
 * The parser owns format concerns (SRT/VTT); this function owns the cross-file
 * decision. It never probes or opens media, so callers can use it before any
 * user file is promoted. A cue that extends slightly beyond a known duration
 * is a warning because containers often report rounded durations. A material
 * conflict is a block and must not create a Track with known-invalid timing.
 */
export function validateSubtitleMedia(
  segments: readonly TranscriptionSegment[],
  mediaDurationSeconds?: number | null,
): SubtitleMediaValidationResult {
  if (segments.length === 0) return { level: "block", ok: false, reason: "empty" };

  let previousEnd = -Infinity;
  for (const segment of segments) {
    if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < 0) {
      return { level: "block", ok: false, reason: "negative-time" };
    }
    if (segment.end <= segment.start) {
      return { level: "block", ok: false, reason: "invalid-range" };
    }
    // A 50 ms normalization allowance matches subtitle-utils' overlap policy.
    if (segment.start < previousEnd - 0.05) {
      return { level: "block", ok: false, reason: "invalid-range" };
    }
    previousEnd = segment.end;
  }

  const lastCueEnd = segments[segments.length - 1].end;
  if (
    mediaDurationSeconds === undefined
    || mediaDurationSeconds === null
    || !Number.isFinite(mediaDurationSeconds)
    || mediaDurationSeconds <= 0
  ) {
    return {
      level: "warning",
      ok: true,
      reason: "duration-unavailable",
      lastCueEnd,
    };
  }

  const toleranceSeconds = Math.max(2, mediaDurationSeconds * 0.1);
  if (lastCueEnd > mediaDurationSeconds + toleranceSeconds) {
    return {
      level: "block",
      ok: false,
      reason: "outside-media",
      lastCueEnd,
      toleranceSeconds,
    };
  }
  if (lastCueEnd > mediaDurationSeconds) {
    return {
      level: "warning",
      ok: true,
      reason: "near-media-end",
      lastCueEnd,
      toleranceSeconds,
    };
  }
  return { level: "ok", ok: true, lastCueEnd, toleranceSeconds };
}
