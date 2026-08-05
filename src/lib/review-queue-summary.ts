export interface ReviewQueueLog {
  reviewItemId: string;
  rating: number | null;
}

/**
 * Mirrors the Review page's "due now" rule without depending on Prisma.
 * Items reviewed today stay out of the queue unless their latest rating was
 * Again (1) or Hard (2), in which case they are intentionally relearning.
 */
export function getDueReviewItemIds(
  dueItemIds: readonly string[],
  todayLogs: readonly ReviewQueueLog[],
): string[] {
  const due = new Set(dueItemIds);
  const reviewedToday = new Set<string>();
  const latestRating = new Map<string, number>();

  for (const log of todayLogs) {
    if (!due.has(log.reviewItemId)) continue;
    reviewedToday.add(log.reviewItemId);
    if (typeof log.rating === "number") {
      const previous = latestRating.get(log.reviewItemId);
      if (previous === undefined || log.rating > previous) {
        latestRating.set(log.reviewItemId, log.rating);
      }
    }
  }

  return dueItemIds.filter((id) => {
    if (!reviewedToday.has(id)) return true;
    const rating = latestRating.get(id);
    return rating === 1 || rating === 2;
  });
}
