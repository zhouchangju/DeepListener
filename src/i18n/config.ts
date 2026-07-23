export const locales = ["en", "zh-CN"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "NEXT_LOCALE";
export const localeCookieMaxAge = 365 * 24 * 60 * 60;
export const legacyLocaleStorageKey = "deeplistener.preferences.locale.v1";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh-CN";
}
