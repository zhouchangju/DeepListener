export type ReviewKeyboardGrade = "again" | "hard" | "good" | "easy";

export type ReviewKeyboardAction =
  | { type: "toggle-answer"; preventDefault: true }
  | { type: "play-audio"; preventDefault: true }
  | { type: "grade"; quality: ReviewKeyboardGrade; preventDefault: false };

interface ReviewKeyboardInput {
  key: string;
  isEditing: boolean;
  /**
   * The event target the keypress originated from. When supplied, shortcuts
   * are suppressed while the user is typing into an input/textarea/select or
   * any contentEditable element, and while focus is inside an open dialog.
   * This prevents grading/answer-reveal from firing while editing a note or
   * interacting with a Radix Dialog even if `isEditing` has not flipped yet.
   */
  target?: EventTarget | null;
}

const gradeByKey: Record<string, ReviewKeyboardGrade> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
};

/**
 * Returns true when the target is an editable form control or lives inside an
 * open dialog, so global keyboard shortcuts should yield to it.
 */
export function isKeyboardEventTargetEditable(target: EventTarget | null | undefined): boolean {
  // Guard against non-DOM / non-Element targets (and Node test envs without
  // a DOM) without using `instanceof Element`, which would throw a
  // ReferenceError in environments where the DOM globals are absent.
  if (!target || typeof (target as Element).tagName !== "string") return false;

  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (typeof el.isContentEditable === "boolean" && el.isContentEditable) return true;
  // Yield to any open Radix Dialog / native dialog so shortcuts don't fire
  // while a modal (note editor, confirm dialog, dropdown) is on screen.
  if (typeof el.closest === "function" && el.closest('[role="dialog"], [data-state="open"], dialog')) return true;
  return false;
}

export function getReviewKeyboardAction({
  key,
  isEditing,
  target,
}: ReviewKeyboardInput): ReviewKeyboardAction | null {
  if (isEditing) {
    return null;
  }

  if (isKeyboardEventTargetEditable(target)) {
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
