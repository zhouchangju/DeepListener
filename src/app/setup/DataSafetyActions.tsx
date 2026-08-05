"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, Download, FolderOpen, Loader2, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DiagnosticsSummary from "./DiagnosticsSummary";

interface BackupSummary {
  id: string;
  createdAt: string;
  fileCount: number;
  bytes: number;
}

interface PendingRestore {
  backupId: string;
  restoreId: string;
  conflicts: string[];
}

interface DesktopBridge {
  saveDiagnostics?: () => Promise<{ ok: boolean; canceled?: boolean; code?: string }>;
  exportBackup?: () => Promise<{ ok: boolean; canceled?: boolean; code?: string }>;
  importBackup?: () => Promise<{ ok: boolean; canceled?: boolean; code?: string }>;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export default function DataSafetyActions() {
  const t = useTranslations("setup.dataSafety");
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [demoSeeded, setDemoSeeded] = useState<boolean | null>(null);
  const [hasNativeDiagnosticsExport, setHasNativeDiagnosticsExport] = useState(false);
  const [hasNativeBackupDialogs, setHasNativeBackupDialogs] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/backups", { cache: "no-store" });
      if (response.ok) {
        const payload = await readJson(response);
        if (Array.isArray(payload.backups)) setBackups(payload.backups as BackupSummary[]);
      }
    } catch {
      // Backup availability is independent from the optional Demo cleanup action.
    }
    try {
      const response = await fetch("/api/demo", { cache: "no-store" });
      if (!response.ok) {
        setDemoSeeded(null);
        return;
      }
      const payload = await readJson(response);
      setDemoSeeded(payload.demoSeeded === true);
    } catch {
      setDemoSeeded(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const bridge = (window as Window & { deepListener?: DesktopBridge }).deepListener;
    setHasNativeDiagnosticsExport(typeof bridge?.saveDiagnostics === "function");
    setHasNativeBackupDialogs(typeof bridge?.exportBackup === "function" && typeof bridge?.importBackup === "function");
  }, []);

  const saveDiagnostics = async () => {
    const bridge = (window as Window & { deepListener?: DesktopBridge }).deepListener;
    if (typeof bridge?.saveDiagnostics !== "function") return;
    setBusy("diagnostics");
    setNotice(null);
    try {
      const result = await bridge.saveDiagnostics();
      if (result.ok && !result.canceled) setNotice(t("diagnosticsSaved"));
      else if (!result.ok) setNotice(t("unavailable"));
    } catch {
      setNotice(t("unavailable"));
    } finally {
      setBusy(null);
    }
  };

  const exportBackup = async () => {
    const bridge = (window as Window & { deepListener?: DesktopBridge }).deepListener;
    if (typeof bridge?.exportBackup !== "function") return;
    setBusy("export-backup");
    setNotice(null);
    try {
      const result = await bridge.exportBackup();
      if (result.ok && !result.canceled) setNotice(t("backupExported"));
      else if (!result.ok) setNotice(t("unavailable"));
    } catch {
      setNotice(t("unavailable"));
    } finally {
      setBusy(null);
    }
  };

  const importBackup = async () => {
    const bridge = (window as Window & { deepListener?: DesktopBridge }).deepListener;
    if (typeof bridge?.importBackup !== "function") return;
    setBusy("import-backup");
    setNotice(null);
    try {
      const result = await bridge.importBackup();
      if (result.ok && !result.canceled) {
        setNotice(t("backupImported"));
        await refresh();
      } else if (!result.ok) setNotice(t("unavailable"));
    } catch {
      setNotice(t("unavailable"));
    } finally {
      setBusy(null);
    }
  };

  const createBackup = async () => {
    setBusy("create");
    setNotice(null);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const payload = await readJson(response);
      if (!response.ok) {
        setNotice(t("unavailable"));
        return;
      }
      setNotice(t("backupCreated"));
      await refresh();
      void payload;
    } catch {
      setNotice(t("unavailable"));
    } finally {
      setBusy(null);
    }
  };

  const removeDemo = async () => {
    if (demoSeeded !== true || busy !== null) return;
    if (!window.confirm(t("removeDemoConfirm"))) return;
    setBusy("remove-demo");
    setNotice(null);
    try {
      const response = await fetch("/api/demo", { method: "DELETE" });
      const payload = await readJson(response);
      if (!response.ok || payload.demoSeeded !== false) {
        setNotice(t("unavailable"));
        return;
      }
      setDemoSeeded(false);
      setNotice(t("demoRemoved"));
    } catch {
      setNotice(t("unavailable"));
    } finally {
      setBusy(null);
    }
  };

  const startRestore = async (backupId: string) => {
    setBusy(backupId);
    setNotice(null);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId }),
      });
      const payload = await readJson(response);
      if (typeof payload.restoreId !== "string") {
        setNotice(t("unavailable"));
        return;
      }
      setPendingRestore({
        backupId,
        restoreId: payload.restoreId,
        conflicts: Array.isArray(payload.conflicts) ? payload.conflicts.filter((item): item is string => typeof item === "string") : [],
      });
    } catch {
      setNotice(t("unavailable"));
    } finally {
      setBusy(null);
    }
  };

  const cancelRestore = async () => {
    if (!pendingRestore) return;
    setBusy("cancel");
    try {
      await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "discard", stageId: pendingRestore.restoreId }),
      });
    } finally {
      setPendingRestore(null);
      setBusy(null);
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setBusy("restore");
    setNotice(null);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId: pendingRestore.backupId, stageId: pendingRestore.restoreId, confirmReplace: true }),
      });
      const payload = await readJson(response);
      if (!response.ok || payload.restored !== true) {
        setNotice(t("unavailable"));
        return;
      }
      setPendingRestore(null);
      setNotice(t("restoreSuccess"));
    } catch {
      setNotice(t("unavailable"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mt-8 border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40">
      <CardHeader className="gap-2 px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="h-5 w-5 text-muted-foreground" /> {t("title")}
        </CardTitle>
        <p className="text-sm font-normal text-muted-foreground">{t("body")}</p>
      </CardHeader>
      <CardContent className="space-y-4 px-5 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={createBackup} disabled={busy !== null} variant="outline">
            {busy === "create" ? <Loader2 className="animate-spin" /> : <Archive />} {busy === "create" ? t("creating") : t("createBackup")}
          </Button>
          {hasNativeBackupDialogs && (
            <>
              <Button type="button" onClick={exportBackup} disabled={busy !== null} variant="outline">
                {busy === "export-backup" ? <Loader2 className="animate-spin" /> : <FolderOpen />} {busy === "export-backup" ? t("exportingBackup") : t("exportBackup")}
              </Button>
              <Button type="button" onClick={importBackup} disabled={busy !== null} variant="outline">
                {busy === "import-backup" ? <Loader2 className="animate-spin" /> : <Upload />} {busy === "import-backup" ? t("importingBackup") : t("importBackup")}
              </Button>
            </>
          )}
          {hasNativeDiagnosticsExport ? (
            <Button type="button" variant="outline" onClick={saveDiagnostics} disabled={busy !== null}>
              {busy === "diagnostics" ? <Loader2 className="animate-spin" /> : <Download />} {t("downloadDiagnostics")}
            </Button>
          ) : (
            <Button asChild type="button" variant="outline">
              <a href="/api/diagnostics" download="deeplistener-diagnostics.json">
                <Download /> {t("downloadDiagnostics")}
              </a>
            </Button>
          )}
        </div>

        <DiagnosticsSummary />

        {demoSeeded === true && (
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-background px-3 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("demoTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("demoBody")}</p>
            </div>
            <Button type="button" variant="outline" onClick={removeDemo} disabled={busy !== null}>
              {busy === "remove-demo" ? <Loader2 className="animate-spin" /> : <Trash2 />} {busy === "remove-demo" ? t("removingDemo") : t("removeDemo")}
            </Button>
          </div>
        )}

        {notice && <p className="rounded-md border bg-background px-3 py-2" role="status" aria-live="polite">{notice}</p>}

        {pendingRestore && (
          <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-400/40 dark:bg-amber-500/10">
            <p className="font-semibold">{t("restoreReady")}</p>
            <p className="text-muted-foreground">{t("restoreWarning")}</p>
            {pendingRestore.conflicts.length > 0 && (
              <p className="text-muted-foreground">{t("conflicts", { count: pendingRestore.conflicts.length })}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={confirmRestore} disabled={busy !== null}>
                {busy === "restore" ? <Loader2 className="animate-spin" /> : <RotateCcw />} {t("confirmRestore")}
              </Button>
              <Button type="button" variant="ghost" onClick={cancelRestore} disabled={busy !== null}>
                <X /> {t("cancelRestore")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="font-medium">{t("existingBackups")}</p>
          {backups.length === 0 ? (
            <p className="text-muted-foreground">{t("noBackups")}</p>
          ) : (
            <ul className="space-y-2" aria-label={t("existingBackups")}>
              {backups.map((backup) => (
                <li key={backup.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
                  <span className="text-muted-foreground">{new Date(backup.createdAt).toLocaleString()} · {t("fileCount", { count: backup.fileCount })}</span>
                  <Button type="button" variant="ghost" onClick={() => startRestore(backup.id)} disabled={busy !== null || pendingRestore !== null}>
                    {busy === backup.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} {t("restore")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
