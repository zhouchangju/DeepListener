"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Global streak badge in the top nav. The streak was previously only visible
 * deep inside dashboard → Behavior tab, so daily practice had no visible
 * continuity hook. Shows nothing until the user has at least a 1-day streak.
 */
export default function NavStreak() {
  const t = useTranslations("nav");
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/streak")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.currentStreak === "number") {
          setStreak(data.currentStreak);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!streak || streak < 1) return null;

  return (
    <Link
      href="/dashboard"
      className="flex h-9 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-warning transition-colors hover:bg-accent tabular-nums"
      title={t("streakTitle", { count: streak })}
      aria-label={t("streakTitle", { count: streak })}
    >
      <Flame className="h-4 w-4" aria-hidden="true" />
      {streak}
    </Link>
  );
}
