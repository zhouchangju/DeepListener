"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requireOkResponse } from "@/lib/client-response";
import UploadDropDialog from "./UploadDropDialog";

export default function UploadButton() {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Processing media and preparing the listening track...");

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

      await requireOkResponse(res, "Upload failed");

      const track = await res.json();
      toast.success("Ready to practice!", { id: toastId });
      router.push(`/practice/${track.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed. Check your OpenAI API Key.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <UploadDropDialog
      triggerLabel="Import Media"
      uploadingLabel="Processing..."
      title="Import local media"
      description="Drop a local audio, MP4, or WebM file here. Video stays local while its audio is prepared for listening practice."
      uploading={uploading}
      processFiles={handleFiles}
    />
  );
}
