"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { requireOkResponse } from "@/lib/client-response";
import UploadDropDialog from "./UploadDropDialog";

export default function UploadButton() {
  const t = useTranslations("library");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading(t("processingMedia"));

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
