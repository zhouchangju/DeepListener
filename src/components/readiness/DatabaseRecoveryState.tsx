import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { ReadinessCheck } from "@/lib/setup-readiness";

export default async function DatabaseRecoveryState({
  check,
}: {
  check: ReadinessCheck;
}) {
  const t = await getTranslations("setup");
  type SetupKey = Parameters<typeof t>[0];

  return (
    <div className="container mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-bold">{t("routeBlocked.title" as SetupKey)}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">{t("routeBlocked.body" as SetupKey)}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/setup">
            {t("routeBlocked.openSetup" as SetupKey)} <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("routeBlocked.backHome" as SetupKey)}</Link>
        </Button>
      </div>
      <div className="mt-8 flex w-full gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm dark:border-emerald-400/25 dark:bg-emerald-500/10">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
        <p className="text-emerald-800 dark:text-emerald-200">{t("routeBlocked.preserved" as SetupKey)}</p>
      </div>
      <details className="mt-6 w-full rounded-xl border bg-card p-4 text-left text-sm">
        <summary className="cursor-pointer font-medium">{t("routeBlocked.details" as SetupKey)}</summary>
        <p className="mt-3 text-muted-foreground">{t(check.detailKey as SetupKey)}</p>
        {check.fixKey && (
          <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-foreground">
            {t("nextPrefix" as SetupKey)} {t(check.fixKey as SetupKey)}
          </p>
        )}
      </details>
    </div>
  );
}
