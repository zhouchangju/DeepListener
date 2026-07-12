interface TimedSubtitle {
  text: string;
  startTime: number;
  endTime: number;
}

export function getActiveSubtitle(
  sentences: TimedSubtitle[],
  time: number,
): string | null {
  if (!Number.isFinite(time) || time < 0) return null;

  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    const sentence = sentences[index];
    if (
      Number.isFinite(sentence.startTime) &&
      Number.isFinite(sentence.endTime) &&
      time >= sentence.startTime &&
      time <= sentence.endTime
    ) {
      return sentence.text;
    }
  }

  return null;
}

