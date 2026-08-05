import Link from "next/link";
import { ArrowRight, ExternalLink, FileAudio, FileText, KeyRound, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDER_GUIDANCE } from "@/lib/provider-guidance";

export default async function TranscriptionDecisionGuide() {
  const t = await getTranslations("setup.decisionGuide");
  type DecisionKey = Parameters<typeof t>[0];

  return (
    <Card className="mb-8 gap-4 border-primary/25 bg-primary/5 py-5 dark:bg-primary/10">
      <CardHeader className="px-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <CardTitle className="text-base">{t("title" as DecisionKey)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t("body" as DecisionKey)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-background/80 p-4">
          <FileAudio className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-medium">{t("embedded.title" as DecisionKey)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("embedded.body" as DecisionKey)}</p>
          <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline" href="/library?import=media">
            {t("embedded.open" as DecisionKey)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="rounded-lg border bg-background/80 p-4">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-medium">{t("sidecar.title" as DecisionKey)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("sidecar.body" as DecisionKey)}</p>
          <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline" href="/library?import=subtitle">
            {t("sidecar.open" as DecisionKey)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="rounded-lg border bg-background/80 p-4">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-medium">{t("provider.title" as DecisionKey)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("provider.body" as DecisionKey)}</p>
          <a className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline" href="/setup#provider-settings">
            {t("provider.open" as DecisionKey)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <div className="rounded-lg border bg-background/80 p-4">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-medium">{t("demo.title" as DecisionKey)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("demo.body" as DecisionKey)}</p>
          <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline" href="/?demo=1">
            {t("demo.open" as DecisionKey)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
      <div id="provider-configuration" className="grid scroll-mt-24 gap-3 px-5 md:grid-cols-3">
        {PROVIDER_GUIDANCE.map((provider) => (
          <div key={provider.id} className={`rounded-lg border bg-background/80 p-4 ${provider.recommended ? "border-primary/50 bg-primary/5 dark:bg-primary/10" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{t(`${provider.copyKey}.label` as DecisionKey)}</p>
              {provider.recommended && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {t("recommended" as DecisionKey)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t(`${provider.copyKey}.bestFor` as DecisionKey)}</p>
            {provider.recommended && <p className="mt-2 text-xs font-medium text-primary">{t("recommendedReason" as DecisionKey)}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{t("externalDisclosure" as DecisionKey)}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline" href={provider.consoleUrl} target="_blank" rel="noreferrer">
                {t("openConsole" as DecisionKey)} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link className="inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:underline" href={provider.pricingUrl} target="_blank" rel="noreferrer">
                {t("pricing" as DecisionKey)} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
