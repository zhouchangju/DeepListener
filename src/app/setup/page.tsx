import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluateSetupReadiness, type ReadinessStatus } from "@/lib/setup-readiness";
import { getProviderSummary } from "@/lib/secrets-store";
import ProviderCardActions from "./ProviderCardActions";

export const dynamic = "force-dynamic";

const statusStyles: Record<ReadinessStatus, { className: string }> = {
  ready: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  action: {
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200",
  },
  limited: {
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200",
  },
};

export default async function SetupPage() {
  const t = await getTranslations("setup");
  type SetupKey = Parameters<typeof t>[0];
  const checks = await evaluateSetupReadiness();
  const actions = checks.filter((check) => check.status === "action").length;
  const ready = checks.filter((check) => check.status === "ready").length;
  const providerSummary = getProviderSummary();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:py-16">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary dark:text-primary">
            <ShieldCheck className="h-4 w-4" />
            {t("eyebrow")}
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("heading")}</h1>
          <p className="mt-3 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/setup">
            <RefreshCw /> {t("runAgain")}
          </Link>
        </Button>
      </div>

      <Card className="mb-8 gap-3 border-primary/25 bg-primary/10 py-5 dark:border-primary/20 dark:bg-primary/10">
        <CardContent className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="font-semibold">{actions === 0 ? t("summaryReady") : t("summaryActions", { count: actions })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("summaryDetail", { ready, total: checks.length })}</p>
          </div>
          {actions > 0 ? (
            <Button disabled>{t("resolveFirst")}</Button>
          ) : (
            <Button asChild>
              <Link href="/library">{t("openLibrary")} <ArrowRight /></Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => {
          const style = statusStyles[check.status];
          const Icon = check.status === "ready" ? CheckCircle2 : check.status === "action" ? AlertTriangle : CircleDashed;
          const statusLabel = check.id === "provider" && check.status === "ready"
            ? t("configured")
            : t(check.status);
          return (
            <Card key={check.id} className="gap-4 py-5">
              <CardHeader className="gap-3 px-5">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-muted-foreground" /> {t(`readiness.${check.id}.label` as SetupKey)}
                  </CardTitle>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${style.className}`}>{statusLabel}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-5 text-sm">
                <p className="text-muted-foreground">{t(check.detailKey as SetupKey, check.values)}</p>
                {check.fixKey && <p className="rounded-lg bg-muted px-3 py-2 font-medium text-foreground">{t("nextPrefix")} {t(check.fixKey as SetupKey, check.values)}</p>}
                {check.id === "provider" && (
                  <ProviderCardActions summary={providerSummary} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-400/25 dark:bg-amber-500/10">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-200">{t("safetyNotice.title")}</p>
          <p className="mt-1 text-amber-700 dark:text-amber-200/80">{t("safetyNotice.body")}</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        {t("providerNote")}
      </div>
    </div>
  );
}
