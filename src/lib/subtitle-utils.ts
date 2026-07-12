import type { TranscriptionSegment } from "./transcription/types";

function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

export function parseSrt(source: string): TranscriptionSegment[] {
  const cues = source.replace(/\r/g, "").trim().split(/\n{2,}/);
  const segments: TranscriptionSegment[] = [];

  for (const cue of cues) {
    const lines = cue.split("\n").filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [startValue, endValue] = lines[timingIndex].split("-->");
    const start = parseTimestamp(startValue);
    const end = parseTimestamp(endValue);
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
