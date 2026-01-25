"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UploadButton() {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

      if (!res.ok) throw new Error("Upload failed");

      const track = await res.json();
      toast.success("Ready to practice!", { id: toastId });
      router.push(`/practice/${track.id}`);
    } catch (error) {
      toast.error("Upload failed. Check your OpenAI API Key.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="file"
        id="audio-upload"
        className="hidden"
        accept="audio/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      <label htmlFor="audio-upload" className="block w-full">
        <Button asChild disabled={uploading} className="w-full">
          <span>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Transcribing..." : "Upload Audio"}
          </span>
        </Button>
      </label>
    </div>
  );
}
