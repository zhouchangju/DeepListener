"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Check, X, FileAudio } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UploadProgress {
  fileName: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function BatchUploadButton() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const router = useRouter();

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Initialize progress
    const initialProgress: UploadProgress[] = files.map((file) => ({
      fileName: file.name,
      status: "pending",
    }));
    setProgress(initialProgress);
    setUploading(true);

    const toastId = toast.loading(
      `Processing ${files.length} audio file${files.length > 1 ? "s" : ""}...`
    );

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/upload", {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) throw new Error("Batch upload failed");

      const data = await res.json();
      const { success, failed } = data as {
        success: Array<{ id: string; title: string; audioUrl: string }>;
        failed: Array<{ fileName: string; error: string }>;
      };

      // Update progress based on results
      const updatedProgress = [...initialProgress];

      success.forEach((item) => {
        const idx = updatedProgress.findIndex(
          (p) => p.fileName === item.title + ".mp3" || p.fileName === item.title
        );
        if (idx !== -1) {
          updatedProgress[idx] = { fileName: item.title, status: "success" };
        }
      });

      failed.forEach((item) => {
        const idx = updatedProgress.findIndex(
          (p) => p.fileName === item.fileName || p.fileName === item.fileName
        );
        if (idx !== -1) {
          updatedProgress[idx] = {
            fileName: item.fileName,
            status: "error",
            error: item.error,
          };
        }
      });

      setProgress(updatedProgress);

      // Show summary toast
      if (failed.length === 0) {
        toast.success(
          `All ${success.length} file${success.length > 1 ? "s" : ""} processed successfully!`,
          { id: toastId }
        );
      } else {
        toast.warning(
          `${success.length} succeeded, ${failed.length} failed. See details below.`,
          { id: toastId }
        );
      }

      // Navigate to the first successful track if any
      if (success.length > 0) {
        setTimeout(() => {
          router.push(`/practice/${success[0].id}`);
        }, 2000);
      }
    } catch {
      toast.error("Batch upload failed. Check your connection.", { id: toastId });
      setProgress(
        initialProgress.map((p) => ({ ...p, status: "error", error: "Upload failed" }))
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative w-full">
        <input
          type="file"
          id="batch-audio-upload"
          className="hidden"
          accept="audio/*"
          multiple
          onChange={handleBatchUpload}
          disabled={uploading}
        />
        <label htmlFor="batch-audio-upload" className="block w-full">
          <Button asChild disabled={uploading} className="w-full" variant="default">
            <span>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Processing..." : "Batch Upload Audio"}
            </span>
          </Button>
        </label>
      </div>

      {/* Progress Display */}
      {progress.length > 0 && (
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          <div className="text-sm font-medium text-gray-700 sticky top-0 bg-white py-2 border-b">
            Upload Progress ({progress.filter((p) => p.status === "success").length} /{" "}
            {progress.length})
          </div>
          {progress.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
            >
              <FileAudio className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">
                  {item.fileName}
                </div>
                {item.error && (
                  <div className="text-xs text-red-600 mt-1">{item.error}</div>
                )}
              </div>
              <div className="flex-shrink-0">
                {item.status === "pending" && (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
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
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
