"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type DiagnosticStatus = "ready" | "action" | "unknown";
type CheckKey = "dataRoot" | "database" | "audioDirectory" | "videoDirectory" | "logsDirectory";

interface DiagnosticsPayload {
  checks: Partial<Record<CheckKey, DiagnosticStatus>>;
  provider: {
    selected?: string;
    configured?: Record<string, boolean>;
  };
  startup?: { previousFailure?: { code?: string; phase?: string } };
  logs?: { includedLines?: unknown[]; truncated?: boolean };
}

const CHECKS: CheckKey[] = ["dataRoot", "database", "audioDirectory", "videoDirectory", "logsDirectory"];

function isStatus(value: unknown): value is DiagnosticStatus {
  return value === "ready" || value === "action" || value === "unknown";
}

function parsePayload(value: unknown): DiagnosticsPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const rawChecks = candidate.checks;
  const rawProvider = candidate.provider;
  if (!rawChecks || typeof rawChecks !== "object" || !rawProvider || typeof rawProvider !== "object") return null;
  const checks: Partial<Record<CheckKey, DiagnosticStatus>> = {};
  for (const key of CHECKS) {
    const status = (rawChecks as Record<string, unknown>)[key];
    if (isStatus(status)) checks[key] = status;
  }
  const provider = rawProvider as Record<string, unknown>;
  const configured = provider.configured && typeof provider.configured === "object"
    ? Object.fromEntries(Object.entries(provider.configured).filter(([, configuredValue]) => typeof configuredValue === "boolean"))
    : {};
  const startup = candidate.startup && typeof candidate.startup === "object" ? candidate.startup as DiagnosticsPayload["startup"] : undefined;
  const logs = candidate.logs && typeof candidate.logs === "object" ? candidate.logs as DiagnosticsPayload["logs"] : undefined;
  return {
    checks,
    provider: {
      selected: typeof provider.selected === "string" ? provider.selected.slice(0, 32) : undefined,
      configured,
    },
    startup,
    logs,
  };
}

export default function DiagnosticsSummary() {
  const t = useTranslations("setup.dataSafety");
  const [snapshot, setSnapshot] = useState<DiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/diagnostics", { cache: "no-store" });
      const payload = parsePayload(await response.json().catch(() => null));
      if (!response.ok || !payload) throw new Error("diagnostics-unavailable");
      setSnapshot(payload);
    } catch {
      setSnapshot(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statusIcon = (status: DiagnosticStatus | undefined) => {
    if (status === "ready") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
    if (status === "action") return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
    return <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  };

  return (
    <section className="space-y-3 rounded-lg border bg-background/60 p-3" aria-labelledby="diagnostics-summary-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="diagnostics-summary-title" className="font-medium">{t("diagnosticsSummaryTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("diagnosticsSummaryBody")}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading} aria-busy={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          <span className="sr-only">{loading ? t("diagnosticsRefreshing") : t("diagnosticsRefresh")}</span>
        </Button>
      </div>

      <div role="status" aria-live="polite" aria-busy={loading} className="space-y-2 text-sm">
        {failed && <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">{t("diagnosticsUnavailable")}</p>}
        {snapshot && (
          <>
            <ul className="grid gap-2 sm:grid-cols-2" aria-label={t("diagnosticsChecks") }>
              {CHECKS.map((key) => {
                const status = snapshot.checks[key];
                return <li key={key} className="flex items-center gap-2 rounded-md border px-2.5 py-2">{statusIcon(status)}<span>{t(`diagnosticsCheck.${key}`)}</span><span className="ml-auto text-xs text-muted-foreground">{t(`diagnosticsStatus.${status ?? "unknown"}`)}</span></li>;
              })}
            </ul>
            <p className="flex items-center gap-2 rounded-md border px-2.5 py-2">
              {snapshot.provider.configured && Object.values(snapshot.provider.configured).some(Boolean) ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              <span>{t("diagnosticsProvider")}</span>
              <span className="ml-auto text-xs text-muted-foreground">{Object.values(snapshot.provider.configured ?? {}).some(Boolean) ? t("diagnosticsProviderConfigured") : t("diagnosticsProviderMissing")}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {snapshot.startup?.previousFailure ? t("diagnosticsPreviousFailure") : t("diagnosticsNoPreviousFailure")}
              {snapshot.logs?.truncated ? ` ${t("diagnosticsLogsTruncated")}` : ""}
            </p>
          </>
        )}
        {!snapshot && !failed && !loading && <p className="text-muted-foreground">{t("diagnosticsLoading")}</p>}
      </div>
    </section>
  );
}
