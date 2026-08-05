"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { writeLocaleCookie } from "@/i18n/client";
import type { Locale } from "@/i18n/config";

export default function LanguageToggle() {
  const locale = useLocale() as Locale;
  const t = useTranslations("language");

  const nextLocale: Locale = locale === "en" ? "zh-CN" : "en";
  const label =
    locale === "en" ? t("switchToChinese") : t("switchToEnglish");
  const shortLabel =
    locale === "en" ? t("chineseShort") : t("englishShort");

  const handleToggle = () => {
    writeLocaleCookie(nextLocale);
    // A locale change replaces the root provider messages and the complete
    // Server Component tree. Start a fresh RSC session instead of asking the
    // current Turbopack client to merge that tree through router.refresh().
    window.location.reload();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 gap-1.5 px-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label={label}
      title={label}
      onClick={handleToggle}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span>{shortLabel}</span>
    </Button>
  );
}
