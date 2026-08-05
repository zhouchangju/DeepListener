"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BrainCircuit, Headphones, Loader2, Mic2, PlayCircle, Repeat2, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, requireOkResponse } from "@/lib/client-response";
import { translations } from "./landing-translations";

export default function HomePage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = locale === "zh-CN" ? translations["zh-CN"] : translations.en;
  const [demoLoading, setDemoLoading] = useState(false);
  const autoDemoStarted = useRef(false);
  const workflow = [
    { icon: Headphones, title: copy.workflow.listen.title, text: copy.workflow.listen.text },
    { icon: Waves, title: copy.workflow.decode.title, text: copy.workflow.decode.text },
    { icon: Mic2, title: copy.workflow.shadow.title, text: copy.workflow.shadow.text },
    { icon: Repeat2, title: copy.workflow.review.title, text: copy.workflow.review.text },
  ];

  const handleTryDemo = useCallback(async () => {
    setDemoLoading(true);
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      await requireOkResponse(response, copy.demoFailed);
      const data = (await response.json()) as { trackId?: unknown };
      if (typeof data.trackId !== "string" || data.trackId.length === 0) {
        throw new Error(copy.demoFailed);
      }
      router.push(`/practice/${data.trackId}?demo=1`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "DATABASE_NOT_READY") {
        toast.info(copy.demoSetupRequired);
        router.push("/setup");
        return;
      }
      toast.error(error instanceof Error ? error.message : copy.demoFailed);
    } finally {
      setDemoLoading(false);
    }
  }, [copy, router]);

  // Setup's explicit "try the demo" action lands here with a user-initiated
  // query flag. Starting only for that flag keeps normal home-page visits
  // side-effect free while making the decision guide's CTA executable.
  useEffect(() => {
    if (searchParams.get("demo") !== "1" || autoDemoStarted.current) return;
    autoDemoStarted.current = true;
    void handleTryDemo();
  }, [handleTryDemo, searchParams]);

  return (
    <div className="overflow-hidden">
      <section className="relative border-b bg-background">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_42%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.12),transparent_35%)]"
          aria-hidden="true"
        />
        <div className="container relative mx-auto grid min-h-[60vh] max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary dark:border-primary/25 dark:bg-primary/10 dark:text-primary">
              <Sparkles className="h-4 w-4" /> {copy.badge}
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              {copy.title} <span className="text-primary dark:text-primary">{copy.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {copy.intro}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" className="h-12 px-6" onClick={handleTryDemo} disabled={demoLoading} aria-busy={demoLoading}>
                {demoLoading ? <Loader2 className="animate-spin" /> : <PlayCircle />} {demoLoading ? copy.demoLoading : copy.demo}
              </Button>
              {demoLoading && (
                <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {copy.demoLoading}
                </p>
              )}
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link href="/setup">{copy.setup} <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 px-6">
                <Link href="/library">{copy.library}</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{copy.demoNote}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> {copy.privacy}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden="true" />
            <Card className="relative gap-5 overflow-hidden border-white/70 bg-card/90 py-6 shadow-2xl dark:border-white/10">
              <CardHeader className="px-6">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{copy.atomLabel}</span><span>0.82x</span>
                </div>
                <CardTitle className="text-xl leading-8">{copy.exampleText}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-6">
                <div className="flex h-28 items-center gap-1 overflow-hidden rounded-xl bg-primary px-4">
                  {[32, 52, 76, 44, 88, 64, 38, 92, 58, 74, 48, 82, 36, 68, 94, 54, 72, 42, 86, 62, 46, 78, 56, 90, 40, 66, 84, 50].map((height, index) => (
                    <span key={index} className="flex-1 rounded-full bg-primary-foreground/70" style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium">
                  <span className="rounded-lg bg-primary/10 px-2 py-3 text-primary dark:bg-primary/15 dark:text-primary">{copy.blindListen}</span>
                  <span className="rounded-lg bg-amber-50 px-2 py-3 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">{copy.markGap}</span>
                  <span className="rounded-lg bg-emerald-50 px-2 py-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">{copy.shadowIt}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary dark:text-primary">{copy.loopLabel}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{copy.loopTitle}</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <Card key={step.title} className="gap-4 py-5">
                <CardHeader className="px-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/15 dark:text-primary"><step.icon /></span>
                    <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-5 text-sm leading-6 text-muted-foreground">{step.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-background py-20">
        <div className="container mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <BrainCircuit className="h-10 w-10 text-primary dark:text-primary" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight">{copy.aiTitle}</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              {copy.aiText}
            </p>
          </div>
          <div className="grid gap-3">
            {[
              { title: copy.values.local.title, text: copy.values.local.text },
              { title: copy.values.byok.title, text: copy.values.byok.text },
              { title: copy.values.selfhosted.title, text: copy.values.selfhosted.text },
            ].map(({ title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-5">
                <p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-white">
        <div className="container mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 md:flex-row md:items-center">
          <div><h2 className="text-3xl font-bold">{copy.ready}</h2><p className="mt-2 text-white/80">{copy.readyText}</p></div>
          <Button asChild size="lg" className="h-12 bg-white px-6 text-primary hover:bg-white/90"><Link href="/setup">{copy.setup} <ArrowRight /></Link></Button>
        </div>
      </section>
    </div>
  );
}
