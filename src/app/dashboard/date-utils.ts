import { localDayDiff } from "@/lib/local-day";

/**
 * Whole calendar days from today (local) to targetDate (local).
 *
 * Uses local-day keys so the countdown agrees with the dashboard's other
 * local-day-based metrics (overdue/future bins, heatmap). Previously this
 * used UTC midnights, which could disagree with the local "today" bucket by
 * a day for users outside UTC.
 */
export function getCountdownDays(today: Date, targetDate: Date): number {
  return Math.max(0, localDayDiff(today, targetDate));
}
