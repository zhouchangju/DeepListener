const MS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function getCountdownDays(today: Date, targetDate: Date): number {
  const todayStart = startOfUtcDay(today);
  const targetStart = startOfUtcDay(targetDate);
  const diffDays = Math.ceil((targetStart.getTime() - todayStart.getTime()) / MS_PER_DAY);

  return Math.max(0, diffDays);
}
