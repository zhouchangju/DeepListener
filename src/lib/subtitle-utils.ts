import type { TranscriptionSegment } from "./transcription/types";
import { validateSubtitleMedia } from "./subtitle-media-validation";

export function parseSubtitleTimestamp(value: string): number | null {
  const trimmed = value.trim();
  const long = trimmed.match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (long) {
    const hours = Number(long[1]);
    const minutes = Number(long[2]);
    const seconds = Number(long[3]);
    if (minutes > 59 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds + Number(long[4]) / 1000;
  }
  const short = trimmed.match(/^(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!short) return null;
  const minutes = Number(short[1]);
  const seconds = Number(short[2]);
  if (seconds > 59) return null;
  return minutes * 60 + seconds + Number(short[3]) / 1000;
}

export function parseSrt(source: string): TranscriptionSegment[] {
  const cues = source.replace(/\r/g, "").trim().split(/\n{2,}/);
  const segments: TranscriptionSegment[] = [];

  for (const cue of cues) {
    const lines = cue.split("\n").filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [startValue, endValue] = lines[timingIndex].split("-->");
    const start = parseSubtitleTimestamp(startValue);
    const end = parseSubtitleTimestamp(endValue);
    if (start === null || end === null || end <= start) continue;
    const text = lines
      .slice(timingIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    segments.push({ text, start, end });
  }

  return segments.map((segment, index) => {
    const next = segments[index + 1];
    if (!next || segment.end <= next.start) return segment;
    return { ...segment, end: Math.max(segment.start, next.start - 0.05) };
  });
}

/** Parse WebVTT cues without executing or preserving markup. */
export function parseVtt(source: string): TranscriptionSegment[] {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!/^WEBVTT(?:\s|$)/i.test(normalized)) return [];
  const cues = normalized
    .split(/\n{2,}/)
    .slice(1)
    .map((cue) => cue.trim())
    .filter(Boolean);
  const segments: TranscriptionSegment[] = [];
  for (const cue of cues) {
    const lines = cue.split("\n").filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [startValue, endValueWithSettings] = lines[timingIndex].split("-->");
    const endValue = endValueWithSettings.trim().split(/\s+/)[0];
    const start = parseSubtitleTimestamp(startValue);
    const end = parseSubtitleTimestamp(endValue);
    if (start === null || end === null || end <= start) continue;
    const text = lines
      .slice(timingIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    segments.push({ text, start, end });
  }
  return normalizeSegments(segments);
}

export function parseSubtitle(source: string, format: "srt" | "vtt"): TranscriptionSegment[] {
  const segments = format === "vtt" ? parseVtt(source) : parseSrt(source);
  if (segments.length === 0) throw new Error("Subtitle contains no usable timed cues");
  return segments;
}

export interface SubtitleMatchResult {
  ok: boolean;
  reason?: "empty" | "negative-time" | "invalid-range" | "outside-media";
}

export function validateSubtitleMatch(
  segments: readonly TranscriptionSegment[],
  mediaDurationSeconds?: number,
): SubtitleMatchResult {
  const result = validateSubtitleMedia(segments, mediaDurationSeconds);
  if (result.level !== "block") return { ok: true };
  if (
    result.reason === "empty"
    || result.reason === "negative-time"
    || result.reason === "invalid-range"
    || result.reason === "outside-media"
  ) {
    return { ok: false, reason: result.reason };
  }
  return { ok: false, reason: "invalid-range" };
}

function normalizeSegments(segments: TranscriptionSegment[]): TranscriptionSegment[] {
  return segments.map((segment, index) => {
    const next = segments[index + 1];
    if (!next || segment.end <= next.start) return segment;
    return { ...segment, end: Math.max(segment.start, next.start - 0.05) };
  });
}
