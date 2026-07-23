import { defaultLocale, isLocale } from "./config";
import type { Locale } from "./config";

interface AcceptLanguageItem {
  tag: string;
  q: number;
}

function parseAcceptLanguage(header: string | null | undefined): AcceptLanguageItem[] {
  if (!header) return [];

  const items: AcceptLanguageItem[] = [];
  for (const part of header.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [tag, ...params] = trimmed.split(";");
    let q = 1;
    for (const param of params) {
      const match = param.trim().match(/^q=(\d+(?:\.\d+)?)$/i);
      if (match) {
        q = Math.min(1, Math.max(0, parseFloat(match[1])));
        break;
      }
    }

    items.push({ tag: tag.trim().toLowerCase(), q });
  }

  return items.sort((a, b) => b.q - a.q);
}

function acceptLanguageToLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase();

  // zh-CN, zh-Hans, zh-TW, zh-Hant, zh-SG, zh-HK, zh-MO, or plain zh → zh-CN
  if (lower === "zh-cn" || lower === "zh" || lower.startsWith("zh-")) {
    return "zh-CN";
  }

  // en, en-US, en-GB, en-AU, etc. → en
  if (lower === "en" || lower.startsWith("en-")) {
    return "en";
  }

  return null;
}

export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  // 1. Valid cookie → use it
  if (isLocale(cookieValue)) {
    return cookieValue;
  }

  // 2. Parse Accept-Language header
  const accepted = parseAcceptLanguage(acceptLanguage);
  for (const item of accepted) {
    const locale = acceptLanguageToLocale(item.tag);
    if (locale) return locale;
  }

  // 3. Default fallback
  return defaultLocale;
}
