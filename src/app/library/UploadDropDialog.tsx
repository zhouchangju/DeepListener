"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { FileAudio, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface UploadDropDialogProps {
  triggerLabel: string;
  uploadingLabel: string;
  title: string;
  description: string;
  multiple?: boolean;
  uploading: boolean;
  processFiles: (files: File[]) => Promise<void>;
}

export default function UploadDropDialog({
  triggerLabel,
  uploadingLabel,
  title,
  description,
  multiple = false,
  uploading,
  processFiles,
}: UploadDropDialogProps) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFilesSelected = async (files: File[]) => {
    if (files.length === 0 || uploading) return;

    setOpen(false);
    setDragging(false);
    await processFiles(files);
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await onFilesSelected(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!uploading) setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setDragging(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;

    await onFilesSelected(Array.from(event.dataTransfer.files));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !uploading && setOpen(nextOpen)}>
      <DialogTrigger asChild>
        <Button disabled={uploading} className="w-full" variant="default">
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? uploadingLabel : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="audio/*"
          multiple={multiple}
          onChange={handleInputChange}
          disabled={uploading}
        />
        <div
          className={cn(
            "flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileAudio className="mb-4 h-10 w-10 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">
            {multiple ? "Drag audio files here" : "Drag an audio file here"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {multiple ? "Drop one or more local audio files" : "Drop one local audio file"}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose from folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
