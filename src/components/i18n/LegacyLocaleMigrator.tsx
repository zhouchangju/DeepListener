"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { planLegacyLocaleMigration, executeLegacyMigration } from "@/i18n/client";
import { legacyLocaleStorageKey } from "@/i18n/config";

/**
 * One-time migration: reads the old localStorage locale preference and
 * migrates it to the NEXT_LOCALE cookie. Runs once on mount inside a
 * NextIntlClientProvider descendant.
 */
export default function LegacyLocaleMigrator() {
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const storage = (() => {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    })();

    const stored = storage?.getItem(legacyLocaleStorageKey) ?? null;
    const plan = planLegacyLocaleMigration(stored);
    const changed = executeLegacyMigration(plan);

    if (changed) {
      router.refresh();
    }
  }, [router]);

  return null;
}
