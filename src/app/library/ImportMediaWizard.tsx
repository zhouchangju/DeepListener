"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileAudio, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ApiError, requireOkResponse } from "@/lib/client-response";
import { validateClientUpload } from "@/lib/client-upload-validation";
import { getClientUploadValidationMessageKey } from "@/lib/client-upload-validation-copy";
import { getRecoveryErrorMessageKey } from "@/lib/import-jobs/recovery-copy";
import { parseSubtitle, validateSubtitleMatch } from "@/lib/subtitle-utils";

interface ImportMediaWizardProps {
  initialOpen?: boolean;
  onRecoveryChange?: () => void;
  configuredProviders?: readonly ("deepgram" | "openai" | "google")[];
}

export default function ImportMediaWizard({ initialOpen = false, onRecoveryChange, configuredProviders }: ImportMediaWizardProps) {
  const t = useTranslations("library");
  const commonT = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [media, setMedia] = useState<File | null>(null);
  const [subtitle, setSubtitle] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaInput = useRef<HTMLInputElement>(null);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const providerMissing = configuredProviders !== undefined && configuredProviders.length === 0 && !subtitle;
  const isVideoMedia = Boolean(
    media && (
      media.type.toLowerCase().startsWith("video/")
      || /\.(mp4|webm|m4v)$/i.test(media.name)
    ),
  );
  // An audio-only file cannot provide embedded subtitles. Do not let a
  // first-time learner upload it only to discover at the transcription step
  // that Setup is required; a video may still contain local embedded captions.
  const providerBlocked = providerMissing && Boolean(media) && !isVideoMedia;

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  const chooseMedia = (file: File | undefined) => {
    if (!file) return;
    const validation = validateClientUpload(file);
    if (!validation.ok) {
      toast.error(t(getClientUploadValidationMessageKey(validation.code) as Parameters<typeof t>[0]));
      return;
    }
    setMedia(file);
  };

  const chooseSubtitle = (file: File | undefined) => {
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "srt" && extension !== "vtt") {
      toast.error(t("subtitleInvalid"));
      return;
    }
    setSubtitle(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseMedia(event.dataTransfer.files[0]);
  };

  const importMedia = async () => {
    if (!media || busy) return;
    setBusy(true);
    let operationId: string | undefined;
    try {
      if (subtitle) {
        const format = subtitle.name.toLowerCase().endsWith(".vtt") ? "vtt" : "srt";
        try {
          const segments = parseSubtitle(await subtitle.text(), format);
          if (!validateSubtitleMatch(segments).ok) throw new Error("Subtitle timings are invalid");
        } catch {
          toast.error(t("subtitleInvalid"));
          setBusy(false);
          return;
        }
      }
      const response = await fetch("/api/import-jobs", {
        method: "POST",
        headers: {
          "Content-Type": media.type || "application/octet-stream",
          "X-DeepListener-File-Name": encodeURIComponent(media.name),
          "X-DeepListener-File-Size": String(media.size),
        },
        body: media,
      });
      await requireOkResponse(response, t("uploadFailed"));
      const created = await response.json() as { operationId: string };
      operationId = created.operationId;
      onRecoveryChange?.();
      if (subtitle) {
        const subtitleResponse = await fetch(`/api/import-jobs/${created.operationId}/subtitle`, {
          method: "POST",
          headers: {
            "Content-Type": subtitle.type || "text/plain",
            "X-DeepListener-File-Name": encodeURIComponent(subtitle.name),
            "X-DeepListener-File-Size": String(subtitle.size),
          },
          body: subtitle,
        });
        await requireOkResponse(subtitleResponse, t("subtitleInvalid"));
      }
      const transcribeResponse = await fetch(`/api/import-jobs/${created.operationId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await requireOkResponse(transcribeResponse, t("uploadFailed"));
      const completed = await transcribeResponse.json() as { job?: { trackId?: string; error?: { code?: string } } };
      if (!completed.job?.trackId) {
        toast.error(t(getRecoveryErrorMessageKey(completed.job?.error?.code) as Parameters<typeof t>[0]));
        onRecoveryChange?.();
        return;
      }
      toast.success(t("readyToPractice"));
      setOpen(false);
      setMedia(null);
      setSubtitle(null);
      router.push(`/practice/${completed.job.trackId}`);
    } catch (error) {
      if (operationId) onRecoveryChange?.();
      const message = error instanceof ApiError && error.code
        ? t(getRecoveryErrorMessageKey(error.code) as Parameters<typeof t>[0])
        : t("uploadFailedHint");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    chooseMedia(event.target.files?.[0]);
    event.target.value = "";
  };

  const onSubtitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    chooseSubtitle(event.target.files?.[0]);
    event.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={busy}>
          <FileText className="mr-2 h-4 w-4" />
          {t("importWithSubtitles")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" closeLabel={commonT("close")}>
        <DialogHeader>
          <DialogTitle>{t("subtitleImportTitle")}</DialogTitle>
          <DialogDescription>{t("subtitleImportDesc")}</DialogDescription>
        </DialogHeader>
        {busy && (
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {t("processingStatus")}
          </p>
        )}
        <input ref={mediaInput} type="file" className="hidden" accept="audio/*,video/mp4,video/webm" onChange={onMediaChange} />
        <input ref={subtitleInput} type="file" className="hidden" accept=".srt,.vtt,text/vtt,application/x-subrip" onChange={onSubtitleChange} />
        <div
          className={`flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <FileAudio className="mb-3 h-9 w-9 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">{media?.name ?? t("subtitleChooseMedia")}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => mediaInput.current?.click()} disabled={busy}>
            {t("chooseMedia")}
          </Button>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4" aria-hidden="true" />{t("subtitleOptional")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle?.name ?? t("subtitleChooseHint")}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => subtitleInput.current?.click()} disabled={busy}>
            {t("chooseSubtitle")}
          </Button>
        </div>
        {providerMissing && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
            {media && !isVideoMedia ? t("noProviderAudioHint") : t("noProviderSubtitleHint")} {" "}
            <Link className="font-semibold underline underline-offset-2" href="/setup#provider-settings">
              {t("openProviderSetup")}
            </Link>
          </p>
        )}
        <Button type="button" onClick={() => void importMedia()} disabled={!media || busy || providerBlocked} aria-busy={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? t("processing") : t("startImport")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
