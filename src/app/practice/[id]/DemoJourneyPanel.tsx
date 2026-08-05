"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useTranslations } from "next-intl";

import { isDemoJourneyComplete, type DemoJourneyState } from "@/lib/demo-journey";

const STEP_KEYS = [
  ["played", "play"],
  ["revealed", "reveal"],
  ["sentenceSelected", "choose"],
  ["saved", "save"],
  ["reviewHandoffSeen", "review"],
] as const;

export default function DemoJourneyPanel({ state }: { state: DemoJourneyState }) {
  const t = useTranslations("practice.demo");
  const complete = isDemoJourneyComplete(state);

  return (
    <section
      className="mb-3 rounded-xl border border-primary/25 bg-primary/5 p-4 dark:bg-primary/10"
      aria-labelledby="demo-journey-title"
      aria-live="polite"
      data-demo-journey="true"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="demo-journey-title" className="font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {complete ? t("complete") : t("intro")}
          </p>
        </div>
        {complete && (
          <Link className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline" href="/library">
            {t("useOwnMedia")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STEP_KEYS.map(([stateKey, labelKey], index) => {
          const done = state[stateKey];
          return (
            <li key={stateKey} className="flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className={done ? "text-foreground" : "text-muted-foreground"}>
                <span className="sr-only">{done ? t("done") : t("notDone")}: </span>
                {index + 1}. {t(labelKey)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
