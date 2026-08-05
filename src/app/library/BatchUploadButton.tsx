"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, FileAudio } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ApiError, requireOkResponse } from "@/lib/client-response";
import { getClientUploadValidationMessageKey } from "@/lib/client-upload-validation-copy";
import { getRecoveryErrorMessageKey } from "@/lib/import-jobs/recovery-copy";
import { classifyMediaKind, validateClientUpload } from "@/lib/client-upload-validation";
import UploadDropDialog from "./UploadDropDialog";
import ImportRecoveryList from "./ImportRecoveryList";

interface UploadProgress {
  fileName: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface BatchUploadButtonProps {
  configuredProviders?: readonly ("deepgram" | "openai" | "google")[];
}

export default function BatchUploadButton({ configuredProviders }: BatchUploadButtonProps) {
  const t = useTranslations("library");
  const noProviderConfigured = configuredProviders !== undefined && configuredProviders.length === 0;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const router = useRouter();
  // Hold the post-success navigation timeout so it can be cleared on unmount
  // or when a new upload starts (otherwise navigating away within 2s would
  // push the user back to the first track after they left).
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, []);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Match the single-file path's fail-fast behavior. Invalid, empty, or
    // oversized files should not enter the multipart request only to fail
    // after the learner has already waited for an upload/transcription pass.
    const invalidFile = files
      .map((file) => ({ file, validation: validateClientUpload(file) }))
      .find(({ validation }) => !validation.ok);
    if (invalidFile) {
      const reasonKey = getClientUploadValidationMessageKey(invalidFile.validation.code);
      toast.error(t("batchValidationError", {
        fileName: invalidFile.file.name || t("trackFallback", { index: 1 }),
        reason: t(reasonKey as Parameters<typeof t>[0]),
      }));
      return;
    }

    if (noProviderConfigured && files.some((file) => classifyMediaKind(file) === "AUDIO")) {
      toast.error(t("noProviderBatchHint"));
      return;
    }

    // Initialize progress
    const initialProgress: UploadProgress[] = files.map((file) => ({
      fileName: file.name,
      status: "pending",
    }));
    setProgress(initialProgress);
    setUploading(true);
    // The batch endpoint processes the selected files as one request, so
    // expose the honest in-flight state for every item while that request is
    // active instead of leaving assistive technology stuck on "waiting".
    setProgress(initialProgress.map((item) => ({ ...item, status: "uploading" })));

    const toastId = toast.loading(t("processingFiles", { count: files.length }));

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/upload", {
        method: "PUT",
        body: formData,
      });

      await requireOkResponse(res, t("batchFailed"));

      const data = await res.json();
      const { success, failed } = data as {
        success: Array<{ id: string; title: string; audioUrl: string; fileName: string }>;
        failed: Array<{ fileName: string; error: string; code?: string }>;
      };

      // Update progress based on results
      const updatedProgress = [...initialProgress];

      success.forEach((item) => {
        const idx = updatedProgress.findIndex(
          (p) => p.fileName === item.fileName && (p.status === "pending" || p.status === "uploading"),
        );
        if (idx !== -1) {
          updatedProgress[idx] = { fileName: item.fileName, status: "success" };
        }
      });

      failed.forEach((item) => {
        const idx = updatedProgress.findIndex(
          (p) => p.fileName === item.fileName && (p.status === "pending" || p.status === "uploading"),
        );
        if (idx !== -1) {
          updatedProgress[idx] = {
            fileName: item.fileName,
            status: "error",
            error: t(getRecoveryErrorMessageKey(item.code) as Parameters<typeof t>[0]),
          };
        }
      });

      setProgress(updatedProgress);
      if (failed.length > 0) setRecoveryVersion((version) => version + 1);

      // Show summary toast
      if (failed.length === 0) {
        toast.success(t("allProcessed", { count: success.length }), { id: toastId });
      } else {
        toast.warning(t("partialProcessed", { success: success.length, failed: failed.length }), { id: toastId });
      }

      // Navigate to the first successful track if any. Track the timer so it
      // is cleared on unmount or overwritten by a subsequent upload.
      if (success.length > 0) {
        if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = setTimeout(() => {
          router.push(`/practice/${success[0].id}`);
          navigateTimerRef.current = null;
        }, 2000);
      }
    } catch (error) {
      console.warn("Batch media import failed", error);
      const message = error instanceof ApiError && error.code
        ? t(getRecoveryErrorMessageKey(error.code) as Parameters<typeof t>[0])
        : t("batchFailed");
      toast.error(message, { id: toastId });
      setProgress(
        initialProgress.map((p) => ({ ...p, status: "error", error: message }))
      );
      setRecoveryVersion((version) => version + 1);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <UploadDropDialog
        triggerLabel={t("batchTrigger")}
        uploadingLabel={t("processing")}
        title={t("batchTitle")}
        description={t("batchDesc")}
        multiple
        uploading={uploading}
        processFiles={handleFiles}
      />

      {/* Progress Display */}
      {progress.length > 0 && (
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          <div className="text-sm font-medium text-foreground sticky top-0 bg-background py-2 border-b border-border" role="status" aria-live="polite" aria-atomic="true">
            {t("uploadProgress", { done: progress.filter((p) => p.status === "success").length, total: progress.length })}
          </div>
          {progress.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
            >
              <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {item.fileName}
                </div>
                <span className="sr-only">
                  {item.status === "pending"
                    ? t("uploadPending")
                    : item.status === "uploading"
                      ? t("uploadUploading")
                      : item.status === "success"
                        ? t("uploadSuccess")
                        : t("uploadError")}
                </span>
                {item.error && (
                  <div className="text-xs text-red-600 mt-1">{item.error}</div>
                )}
              </div>
              <div className="flex-shrink-0">
                {item.status === "pending" && (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
                {item.status === "uploading" && (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                )}
                {item.status === "success" && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {item.status === "error" && (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {progress.length > 0 && progress.every((p) => p.status !== "pending") && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProgress([])}
            disabled={uploading}
          >
            {t("clear")}
          </Button>
        </div>
      )}

      <ImportRecoveryList refreshToken={recoveryVersion} configuredProviders={configuredProviders} />
    </div>
  );
}
