"use client";

import { isLocale, legacyLocaleStorageKey, localeCookieName, localeCookieMaxAge, defaultLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export function readLocaleCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${localeCookieName}=([^;]*)`));
  return match?.[1] || undefined;
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;

  document.cookie = `${localeCookieName}=${locale}; Path=/; Max-Age=${localeCookieMaxAge}; SameSite=Lax`;
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface LegacyMigrationPlan {
  action: "none" | "setCookie" | "deleteOnly";
  locale?: Locale;
}

/**
 * Pure function: decides what to do with the legacy localStorage preference.
 *
 * Rules:
 * 1. No legacy value → noop.
 * 2. Legacy value illegal → delete old key, don't touch cookie.
 * 3. Legacy value legal → legacy takes priority over existing cookie.
 */
export function planLegacyLocaleMigration(
  storedLocale: string | null,
): LegacyMigrationPlan {
  if (!storedLocale) {
    return { action: "none" };
  }

  if (!isLocale(storedLocale)) {
    return { action: "deleteOnly" };
  }

  return { action: "setCookie", locale: storedLocale };
}

/**
 * Execute the legacy migration plan. Returns true if the cookie was changed
 * (meaning the caller should router.refresh()).
 */
export function executeLegacyMigration(plan: LegacyMigrationPlan): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;

  switch (plan.action) {
    case "none":
      return false;

    case "deleteOnly": {
      try {
        storage.removeItem(legacyLocaleStorageKey);
      } catch { /* ignore */ }
      return false;
    }

    case "setCookie": {
      const target = plan.locale || defaultLocale;

      // Delete old key first, then write cookie
      // This ordering prevents a refresh loop: if we delete after writing,
      // a failure to delete on next mount could re-trigger the migration.
      try {
        storage.removeItem(legacyLocaleStorageKey);
      } catch {
        // If deletion fails, don't write cookie to avoid infinite refresh
        return false;
      }

      const currentCookie = readLocaleCookie();
      writeLocaleCookie(target);

      // Only refresh if the cookie actually changed
      return currentCookie !== target;
    }

    default:
      return false;
  }
}
