"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold mb-2">{t("somethingWrong")}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t("somethingWrongDesc")}
      </p>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
