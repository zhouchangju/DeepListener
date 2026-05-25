export type DictationWordDiff =
  | { status: "correct"; expected: string; actual: string }
  | { status: "missing"; expected: string }
  | { status: "extra"; actual: string }
  | { status: "different"; expected: string; actual: string };

export interface DictationComparison {
  accuracy: number;
  isExactAfterNormalization: boolean;
  missingWords: string[];
  extraWords: string[];
  wordDiff: DictationWordDiff[];
}

export function normalizeDictationText(text: string) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\u2013\u2014]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function compareDictationAnswer(
  expectedText: string,
  actualText: string
): DictationComparison {
  const expectedWords = normalizeDictationText(expectedText);
  const actualWords = normalizeDictationText(actualText);
  const wordDiff = alignWords(expectedWords, actualWords);
  const correctCount = wordDiff.filter((item) => item.status === "correct").length;
  const missingWords = wordDiff.flatMap((item) =>
    item.status === "missing" || item.status === "different" ? [item.expected] : []
  );
  const extraWords = wordDiff.flatMap((item) =>
    item.status === "extra" || item.status === "different" ? [item.actual] : []
  );

  return {
    accuracy:
      expectedWords.length === 0
        ? actualWords.length === 0
          ? 100
          : 0
        : Math.round((correctCount / expectedWords.length) * 100),
    isExactAfterNormalization:
      expectedWords.length === actualWords.length &&
      expectedWords.every((word, index) => word === actualWords[index]),
    missingWords,
    extraWords,
    wordDiff,
  };
}

function alignWords(expectedWords: string[], actualWords: string[]) {
  const costs = Array.from({ length: expectedWords.length + 1 }, () =>
    Array(actualWords.length + 1).fill(0)
  );

  for (let i = 0; i <= expectedWords.length; i += 1) {
    costs[i][0] = i;
  }

  for (let j = 0; j <= actualWords.length; j += 1) {
    costs[0][j] = j;
  }

  for (let i = 1; i <= expectedWords.length; i += 1) {
    for (let j = 1; j <= actualWords.length; j += 1) {
      const substitutionCost =
        expectedWords[i - 1] === actualWords[j - 1] ? 0 : 1;
      costs[i][j] = Math.min(
        costs[i - 1][j] + 1,
        costs[i][j - 1] + 1,
        costs[i - 1][j - 1] + substitutionCost
      );
    }
  }

  const diff: DictationWordDiff[] = [];
  let i = expectedWords.length;
  let j = actualWords.length;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      expectedWords[i - 1] === actualWords[j - 1] &&
      costs[i][j] === costs[i - 1][j - 1]
    ) {
      diff.push({
        status: "correct",
        expected: expectedWords[i - 1],
        actual: actualWords[j - 1],
      });
      i -= 1;
      j -= 1;
      continue;
    }

    if (i > 0 && j > 0 && costs[i][j] === costs[i - 1][j - 1] + 1) {
      diff.push({
        status: "different",
        expected: expectedWords[i - 1],
        actual: actualWords[j - 1],
      });
      i -= 1;
      j -= 1;
      continue;
    }

    if (i > 0 && costs[i][j] === costs[i - 1][j] + 1) {
      diff.push({ status: "missing", expected: expectedWords[i - 1] });
      i -= 1;
      continue;
    }

    if (j > 0) {
      diff.push({ status: "extra", actual: actualWords[j - 1] });
      j -= 1;
    }
  }

  return diff.reverse();
}
