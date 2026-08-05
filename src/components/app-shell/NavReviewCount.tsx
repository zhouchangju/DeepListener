"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export const REVIEW_COUNT_INVALIDATED_EVENT = "deeplistener:review-count-invalidated";

export default function NavReviewCount() {
  const t = useTranslations("nav");
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/review/count", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { count?: unknown };
      if (typeof data.count === "number" && Number.isInteger(data.count) && data.count >= 0) {
        setCount(data.count);
      }
    } catch {
      // The badge is optional; navigation remains usable when local data is unavailable.
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const handleInvalidation = () => void refresh();
    window.addEventListener(REVIEW_COUNT_INVALIDATED_EVENT, handleInvalidation);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener(REVIEW_COUNT_INVALIDATED_EVENT, handleInvalidation);
    };
  }, [refresh]);

  if (count === null || count === 0) return null;

  const label = t("reviewDueLabel", { count });
  return (
    <span
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-foreground tabular-nums"
      title={label}
      aria-label={label}
    >
      {count}
    </span>
  );
}
