/**
 * FSRS (Free Spaced Repetition Scheduler) Wrapper
 *
 * Implements the FSRS-4.5 algorithm for optimized spaced repetition scheduling.
 * Based on: https://github.com/open-spaced-repetition/fsrs-rs
 *
 * Key advantages over traditional SM-2:
 * - Based on 10M+ real user reviews
 * - Dynamic difficulty and stability tracking
 * - 15-20% better retention with 18% fewer reviews
 */

import { FSRS, Rating, createEmptyCard, type Grade } from 'ts-fsrs';

// Initialize FSRS with optimal parameters for language learning
const f = new FSRS({
  request_retention: 0.9,        // Target 90% retention rate
  maximum_interval: 36500,       // Max interval: 100 years (effectively infinite)
});

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Calculate next review state using FSRS algorithm
 *
 * @param currentState - Current card state from database
 * @param rating - User's rating for this review
 * @returns Next state with updated due date, stability, difficulty
 */
export function calculateNextReview(
  currentState: {
    stability?: number | null;
    difficulty?: number | null;
    state?: number | null;
    reps?: number | null;
    lapses?: number | null;
    lastReview?: Date | null;
    due?: Date;
  },
  rating: ReviewRating
) {
  // Initialize or load card
  const card = createEmptyCard();

  // Load existing state if available
  if (currentState.stability !== null && currentState.stability !== undefined) {
    card.stability = currentState.stability;
  }
  if (currentState.difficulty !== null && currentState.difficulty !== undefined) {
    card.difficulty = currentState.difficulty;
  }
  if (currentState.due) {
    card.due = currentState.due;
  }
  if (currentState.state !== null && currentState.state !== undefined) {
    card.state = currentState.state;
  }
  if (currentState.reps !== null && currentState.reps !== undefined) {
    card.reps = currentState.reps;
  }
  if (currentState.lapses !== null && currentState.lapses !== undefined) {
    card.lapses = currentState.lapses;
  }
  if (currentState.lastReview) {
    card.last_review = currentState.lastReview;
  }

  // Map rating to FSRS Rating enum
  const fsrsRating = mapRating(rating);

  // Calculate next state (requires current time)
  const now = new Date();
  const recordLog = f.next(card, now, fsrsRating);

  return {
    nextReview: recordLog.card.due,
    stability: recordLog.card.stability,
    difficulty: recordLog.card.difficulty,
    state: recordLog.card.state,
    reps: recordLog.card.reps,
    lapses: recordLog.card.lapses,
    lastReview: recordLog.card.last_review,
  };
}

/**
 * Map string rating to FSRS Rating enum
 */
function mapRating(rating: ReviewRating): Grade {
  switch (rating) {
    case 'again':
      return Rating.Again;
    case 'hard':
      return Rating.Hard;
    case 'good':
      return Rating.Good;
    case 'easy':
      return Rating.Easy;
    default:
      return Rating.Good;
  }
}

/**
 * Get human-readable interval description
 */
export function getIntervalDescription(stability: number): string {
  const days = stability;

  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  if (days < 30) {
    return `${Math.round(days)} day${days !== 1 ? 's' : ''}`;
  }

  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  }

  const years = (days / 365).toFixed(1);
  return `${years} year${years !== '1.0' ? 's' : ''}`;
}

/**
 * Get suggested rating based on response time and correctness
 * (Optional helper for adaptive rating)
 */
export function suggestRating(
  isCorrect: boolean,
  responseTimeSeconds: number,
  currentStability: number
): ReviewRating {
  // Incorrect answer -> Again
  if (!isCorrect) {
    return 'again';
  }

  // Very fast answer (< 2 seconds) with good stability -> Easy
  if (responseTimeSeconds < 2 && currentStability > 7) {
    return 'easy';
  }

  // Fast answer (< 5 seconds) -> Good
  if (responseTimeSeconds < 5) {
    return 'good';
  }

  // Slow answer (> 5 seconds) -> Hard
  return 'hard';
}

/**
 * Get card statistics for UI display
 */
export function getCardStats(item: {
  stability: number;
  difficulty: number;
  retrieval: number;
  lapse: number;
}) {
  const totalReviews = item.retrieval + item.lapse;
  const successRate = totalReviews > 0
    ? (item.retrieval / totalReviews) * 100
    : 0;

  return {
    totalReviews,
    successRate: successRate.toFixed(1) + '%',
    stability: getIntervalDescription(item.stability),
    difficulty: getDifficultyLabel(item.difficulty),
  };
}

/**
 * Convert numeric difficulty to label
 */
export function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 3) return 'Easy';
  if (difficulty <= 5) return 'Normal';
  if (difficulty <= 8) return 'Hard';
  return 'Very Hard';
}
