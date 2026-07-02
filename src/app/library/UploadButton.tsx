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
    const toastId = toast.loading("Processing audio with Whisper...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
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
      triggerLabel="Upload Audio"
      uploadingLabel="Transcribing..."
      title="Upload audio"
      description="Drop a local audio file here, or keep using the folder picker."
      uploading={uploading}
      processFiles={handleFiles}
    />
  );
}
