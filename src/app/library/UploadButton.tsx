"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ApiError, requireOkResponse } from "@/lib/client-response";
import { validateClientUpload } from "@/lib/client-upload-validation";
import { getClientUploadValidationMessageKey } from "@/lib/client-upload-validation-copy";
import { getRecoveryErrorMessageKey } from "@/lib/import-jobs/recovery-copy";
import UploadDropDialog from "./UploadDropDialog";
import ImportRecoveryList from "./ImportRecoveryList";
import ImportMediaWizard from "./ImportMediaWizard";

interface UploadButtonProps {
  initialWizardOpen?: boolean;
  configuredProviders?: readonly ("deepgram" | "openai" | "google")[];
}

export default function UploadButton({ initialWizardOpen = false, configuredProviders }: UploadButtonProps) {
  const t = useTranslations("library");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  // Hold the progress interval id in a ref so we can clear it from finally
  // without re-rendering on every tick.
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noProviderConfigured = configuredProviders !== undefined && configuredProviders.length === 0;

  const stopProgressTimer = () => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Client-side pre-validation: reject obviously wrong files (wrong type
    // or too large) before spending the upload + transcription round-trip.
    // The server is still authoritative; this just fails fast.
    const validation = validateClientUpload(file);
    if (!validation.ok) {
      toast.error(t(getClientUploadValidationMessageKey(validation.code) as Parameters<typeof t>[0]));
      return;
    }
    if (noProviderConfigured && validation.mediaKind === "AUDIO") {
      toast.error(t("noProviderAudioHint"));
      return;
    }

    setUploading(true);
    const toastId = toast.loading(t("processingMedia"));

    // Track elapsed time so the user can tell a long upload is progressing
    // rather than hanging silently. The transcription step can take minutes,
    // and a static "Processing..." toast used to look frozen.
    const startedAt = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      toast.loading(t("transcribingProgress", { elapsed }), { id: toastId });
    }, 5000);

    try {
      const res = await fetch("/api/import-jobs", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-DeepListener-File-Name": encodeURIComponent(file.name),
          "X-DeepListener-File-Size": String(file.size),
        },
        body: file,
      });

      await requireOkResponse(res, t("uploadFailed"));
      const created = await res.json() as { operationId: string };
      const transcribeRes = await fetch(`/api/import-jobs/${created.operationId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await requireOkResponse(transcribeRes, t("uploadFailed"));
      const completed = await transcribeRes.json() as { job?: { trackId?: string; error?: { code?: string } } };
      const trackId = completed.job?.trackId;
      if (!trackId) {
        toast.error(t(getRecoveryErrorMessageKey(completed.job?.error?.code) as Parameters<typeof t>[0]), { id: toastId });
        setRecoveryVersion((version) => version + 1);
        return;
      }
      toast.success(t("readyToPractice"), { id: toastId });
      router.push(`/practice/${trackId}`);
    } catch (error) {
      const message = error instanceof ApiError && error.code
        ? t(getRecoveryErrorMessageKey(error.code) as Parameters<typeof t>[0])
        : t("uploadFailedHint");
      toast.error(message, { id: toastId });
      setRecoveryVersion((version) => version + 1);
    } finally {
      stopProgressTimer();
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <UploadDropDialog
        triggerLabel={t("importMedia")}
        uploadingLabel={t("processing")}
        title={t("importMediaTitle")}
        description={t("importMediaDesc")}
        uploading={uploading}
        processFiles={handleFiles}
      />
      {noProviderConfigured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
          {t("noProviderImportHint")} {" "}
          <Link className="font-semibold underline underline-offset-2" href="/library?import=subtitle">
            {t("openSubtitleImport")}
          </Link>{" "}
          <Link className="font-semibold underline underline-offset-2" href="/setup#provider-settings">
            {t("openProviderSetup")}
          </Link>
        </p>
      )}
      <ImportMediaWizard
        initialOpen={initialWizardOpen}
        configuredProviders={configuredProviders}
        onRecoveryChange={() => setRecoveryVersion((version) => version + 1)}
      />
      <ImportRecoveryList refreshToken={recoveryVersion} configuredProviders={configuredProviders} />
    </div>
  );
}
