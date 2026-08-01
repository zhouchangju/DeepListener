import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localDateKey } from "@/lib/local-day";

export const dynamic = "force-dynamic";

/**
 * Returns the current study streak (consecutive days with any recorded study
 * time) for the global nav streak badge. Mirrors the streak logic in
 * dashboard/BehaviorCharts.tsx: today counts; if today has no time yet, the
 * streak still counts when yesterday was active.
 */
export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 366);
    const sessions = await prisma.studySession.findMany({
      where: { date: { gte: since }, duration: { gt: 0 } },
      select: { date: true, duration: true },
    });

    const minutesByDay = new Map<string, number>();
    for (const session of sessions) {
      const key = localDateKey(session.date);
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + session.duration);
    }

    let currentStreak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const key = localDateKey(checkDate);
      if ((minutesByDay.get(key) ?? 0) > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today has no study time yet — fall back to yesterday before giving up.
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return NextResponse.json({ currentStreak });
  } catch (error) {
    console.error("Streak error:", error);
    return NextResponse.json({ currentStreak: 0 }, { status: 500 });
  }
}
