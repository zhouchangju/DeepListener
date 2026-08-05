"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Trash2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { requireOkResponse } from "@/lib/client-response";
import { getRecoveryErrorMessageKey } from "@/lib/import-jobs/recovery-copy";

interface RecoveryJob {
  id: string;
  status: string;
  displayName: string;
  mediaKind: string;
  updatedAt: string;
  provider?: string;
  error?: { code: string };
  trackId?: string;
  hasSubtitle: boolean;
}

type ProviderId = "deepgram" | "openai" | "google";

interface ImportRecoveryListProps {
  refreshToken?: number;
  /** Masked server-side configuration; never contains credential values. */
  configuredProviders?: readonly ProviderId[];
}

export default function ImportRecoveryList({ refreshToken = 0, configuredProviders }: ImportRecoveryListProps) {
  const t = useTranslations("library");
  const router = useRouter();
  // An omitted configuration list is an unknown state, not permission to
  // advertise every provider. The server still validates retries, but hiding
  // guaranteed-to-fail choices keeps the learner-facing recovery path honest.
  const providerOptions = configuredProviders ?? [];
  const [jobs, setJobs] = useState<RecoveryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryElapsed, setRetryElapsed] = useState(0);

  useEffect(() => {
    if (!retryingId) {
      setRetryElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setRetryElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryingId]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/import-jobs", { cache: "no-store" });
      await requireOkResponse(response, t("recoveryLoadFailed"));
      const data = await response.json() as { jobs?: RecoveryJob[] };
      setJobs((data.jobs ?? []).filter((job) =>
        job.status === "FAILED"
        || job.status === "READY"
        || job.status === "RECEIVING"
        || job.status === "TRANSCRIBING"
        || job.status === "ACTIVATING",
      ));
    } catch (error) {
      // Recovery is an enhancement; keep the main Library usable if the
      // local manifest directory cannot be read.
      console.warn("Import recovery list unavailable", error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const retry = async (job: RecoveryJob, provider?: string) => {
    setBusyId(job.id);
    setRetryingId(job.id);
    try {
      const response = await fetch(`/api/import-jobs/${job.id}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider ? { provider } : {}),
      });
      await requireOkResponse(response, t("recoveryRetryFailed"));
      const data = await response.json() as { job?: RecoveryJob };
      if (data.job?.trackId) {
        router.push(`/practice/${data.job.trackId}`);
        return;
      }
      if (data.job?.error) {
        toast.error(t(getRecoveryErrorMessageKey(data.job.error.code) as Parameters<typeof t>[0]));
      }
      await load();
      if (!data.job?.error) toast.success(t("recoveryRetryStarted"));
    } catch (error) {
      console.warn("Import recovery retry failed", error);
      toast.error(t("recoveryRetryFailed"));
      await load();
    } finally {
      setBusyId(null);
      setRetryingId(null);
    }
  };

  const remove = async (job: RecoveryJob) => {
    if (!window.confirm(t("recoveryConfirm", { name: job.displayName }))) return;
    setBusyId(job.id);
    try {
      const response = await fetch(`/api/import-jobs/${job.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      await requireOkResponse(response, t("recoveryDeleteFailed"));
      await load();
    } catch (error) {
      console.warn("Import recovery removal failed", error);
      toast.error(t("recoveryDeleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const replaceSubtitle = async (job: RecoveryJob, file: File) => {
    setBusyId(job.id);
    try {
      const response = await fetch(`/api/import-jobs/${job.id}/subtitle`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "text/plain",
          "X-DeepListener-File-Name": encodeURIComponent(file.name),
          "X-DeepListener-File-Size": String(file.size),
        },
        body: file,
      });
      await requireOkResponse(response, t("subtitleInvalid"));
      await retry(job);
    } catch (error) {
      console.warn("Import recovery subtitle replacement failed", error);
      toast.error(t("subtitleInvalid"));
      setBusyId(null);
    }
  };

  if (loading || jobs.length === 0) return null;

  return (
    <section className="rounded-lg border border-amber-300/60 bg-amber-50/70 p-3 text-left dark:border-amber-400/25 dark:bg-amber-500/10" aria-labelledby="import-recovery-heading">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
        <Wrench className="h-4 w-4" aria-hidden="true" />
        <h2 id="import-recovery-heading">{t("recoveryTitle")}</h2>
      </div>
      <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-100/80">{t("recoveryBody")}</p>
      <div className="space-y-2" aria-live="polite">
        {jobs.map((job) => {
          const busy = busyId === job.id;
          const canRetry = job.status !== "RECEIVING";
          const canRemove = job.status !== "TRANSCRIBING" && job.status !== "ACTIVATING";
          const statusLabel = job.status === "READY"
            ? t("recoveryReady")
            : job.status === "RECEIVING"
              ? t("recoveryInterrupted")
              : job.status === "TRANSCRIBING" || job.status === "ACTIVATING"
                ? t("recoveryProcessing")
                : t("recoveryFailed");
          return (
            <div key={job.id} className="rounded-md border bg-background/80 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{job.displayName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusLabel}
                    {job.hasSubtitle ? ` · ${t("recoverySubtitleAttached")}` : ""}
                  </p>
                </div>
                {job.error && (
                  <p className="max-w-sm text-xs text-red-700 dark:text-red-300">
                    {t(getRecoveryErrorMessageKey(job.error.code) as Parameters<typeof t>[0])}
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => void retry(job)} disabled={busy || !canRetry}>
                  {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  {t("recoveryRetry")}
                </Button>
                {providerOptions.length > 0 && (
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="sr-only">{t("recoveryProviderLabel")}</span>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2"
                      defaultValue=""
                      disabled={busy || !canRetry}
                      onChange={(event) => {
                        if (event.target.value) void retry(job, event.target.value);
                      }}
                    >
                      <option value="">{t("recoveryChangeProvider")}</option>
                      {providerOptions.map((provider) => (
                        <option key={provider} value={provider}>
                          {provider === "deepgram" ? "Deepgram" : provider === "openai" ? "OpenAI" : "Google"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {retryingId === job.id && (
                  <>
                    <span className="text-xs text-muted-foreground" aria-hidden="true">
                      {t("recoveryRetrying", { elapsed: retryElapsed })}
                    </span>
                    <span className="sr-only" role="status" aria-live="polite">
                      {t("recoveryRetryAnnounced")}
                    </span>
                  </>
                )}
                <Link className="text-xs underline underline-offset-2" href="/setup">{t("recoveryOpenSetup")}</Link>
                <label className="cursor-pointer text-xs underline underline-offset-2">
                  {t("recoveryChangeSubtitle")}
                  <input
                    type="file"
                    accept=".srt,.vtt,text/vtt,application/x-subrip"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void replaceSubtitle(job, file);
                    }}
                  />
                </label>
                <Button size="sm" variant="ghost" className="ml-auto text-red-700 dark:text-red-300" onClick={() => void remove(job)} disabled={busy || !canRemove}>
                  <Trash2 /> {t("recoveryDelete")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
