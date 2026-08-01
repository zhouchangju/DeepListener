"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { requireOkResponse } from "@/lib/client-response";
import { validateClientUpload } from "@/lib/client-upload-validation";
import UploadDropDialog from "./UploadDropDialog";

export default function UploadButton() {
  const t = useTranslations("library");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  // Hold the progress interval id in a ref so we can clear it from finally
  // without re-rendering on every tick.
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      toast.error(validation.message ?? t("uploadFailed"));
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
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-DeepListener-File-Name": encodeURIComponent(file.name),
          "X-DeepListener-File-Size": String(file.size),
        },
        body: file,
      });

      await requireOkResponse(res, t("uploadFailed"));

      const track = await res.json();
      toast.success(t("readyToPractice"), { id: toastId });
      router.push(`/practice/${track.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadFailedHint"), { id: toastId });
    } finally {
      stopProgressTimer();
      setUploading(false);
    }
  };

  return (
    <UploadDropDialog
      triggerLabel={t("importMedia")}
      uploadingLabel={t("processing")}
      title={t("importMediaTitle")}
      description={t("importMediaDesc")}
      uploading={uploading}
      processFiles={handleFiles}
    />
  );
}
