export type ReviewKeyboardGrade = "again" | "hard" | "good" | "easy";

export type ReviewKeyboardAction =
  | { type: "toggle-answer"; preventDefault: true }
  | { type: "play-audio"; preventDefault: true }
  | { type: "grade"; quality: ReviewKeyboardGrade; preventDefault: false };

interface ReviewKeyboardInput {
  key: string;
  isEditing: boolean;
}

const gradeByKey: Record<string, ReviewKeyboardGrade> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
};

export function getReviewKeyboardAction({
  key,
  isEditing,
}: ReviewKeyboardInput): ReviewKeyboardAction | null {
  if (isEditing) {
    return null;
  }

  if (key === " ") {
    return { type: "toggle-answer", preventDefault: true };
  }

  if (key.toLowerCase() === "r") {
    return { type: "play-audio", preventDefault: true };
  }

  const quality = gradeByKey[key.toLowerCase()];
  return quality ? { type: "grade", quality, preventDefault: false } : null;
}
