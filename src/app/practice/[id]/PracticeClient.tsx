"use client";

import { useState, useEffect, useCallback } from "react";

import AudioPlayer from "@/components/feature/AudioPlayer";

import DiagnosisModal from "@/components/feature/DiagnosisModal";

import ShadowingConsole from "@/components/feature/ShadowingConsole";
import { shouldRenderBackgroundAudioPlayer, shouldRenderTrackNotes } from "@/components/feature/shadowing/presentation";

import { Button } from "@/components/ui/button";

import { CheckCircle2, Eye, EyeOff, Mic2, Loader2, Edit3, Download } from "lucide-react";

import { toast } from "sonner";

import { fetchAndDecodeAudio } from "@/lib/audio-utils";

import NoteEditor from "@/components/feature/NoteEditor";

import RenameTrackModal from "@/components/feature/RenameTrackModal";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { downloadResponseBlob } from "@/lib/client-download";
import { requireOkResponse } from "@/lib/client-response";
import DemoJourneyPanel from "./DemoJourneyPanel";
import {
  advanceDemoJourney,
  INITIAL_DEMO_JOURNEY_STATE,
  type DemoJourneyEvent,
} from "@/lib/demo-journey";



// Define strict types matching Prisma output

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  formatting?: string | null;
  reviewItem?: { tags?: { name: string }[]; userNote?: string | null; difficulty?: string } | null;
}



interface Track {
  id: string;
  title: string;
  audioUrl: string;
  videoUrl?: string | null;
  note?: string | null;
  trackType?: string | null;
  trackTopic?: string | null;
  sentences: Sentence[];
}



interface PracticeClientProps {
  track: Track;
  initialBlindMode?: boolean;
  demoMode?: boolean;
}



export default function PracticeClient({
  track,
  initialBlindMode = false,
  demoMode = false,
}: PracticeClientProps) {
  const router = useRouter();
  const t = useTranslations("practice");
  const { setMode } = useTimeTracking();
  const displayTitle = demoMode ? t("demoTrackTitle") : track.title;

  useEffect(() => {
    setMode("LISTENING");
    return () => setMode("IDLE");
  }, [setMode]);

  const [capturingSentenceId, setCapturingSentenceId] = useState<string | null>(null);
  const [captureHandoffVisible, setCaptureHandoffVisible] = useState(false);
  const [demoJourney, setDemoJourney] = useState(INITIAL_DEMO_JOURNEY_STATE);

  const [blindMode, setBlindMode] = useState(initialBlindMode);

  const [shadowingMode, setShadowingMode] = useState(false);

  const [shadowIndex, setShadowIndex] = useState(0);

  const [fullAudioBuffer, setFullAudioBuffer] = useState<AudioBuffer | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const [note, setNote] = useState<string | null>(track.note || null);

  const recordDemoEvent = useCallback(
    (event: DemoJourneyEvent) => {
      if (!demoMode) return;
      setDemoJourney((state) => advanceDemoJourney(state, event));
    },
    [demoMode],
  );

  useEffect(() => {
    if (demoMode && captureHandoffVisible) {
      recordDemoEvent("reviewHandoffSeen");
    }
  }, [captureHandoffVisible, demoMode, recordDemoEvent]);

  // Keep the note in sync with the server prop after router.refresh() so an
  // externally-updated note is reflected instead of the stale local copy.
  useEffect(() => {
    setNote(track.note ?? null);
  }, [track.note]);

  // 预加载音频 Buffer，为了 Shadowing 模式下的极速切片
  useEffect(() => {
    let cancelled = false;
    const preload = () => {
      fetchAndDecodeAudio(track.audioUrl)
        .then(buffer => {
          if (!cancelled) setFullAudioBuffer(buffer);
        })
        .catch(err => {
          // Previously this only logged to console, leaving the "Start
          // shadowing" button spinning forever with no explanation — which
          // blocks the core "capture in the moment of not-understanding"
          // workflow. Surface it with a retry so the user can recover.
          console.error("Audio preload failed", err);
          if (cancelled) return;
          toast.error(t("audioPreloadFailed"), {
            action: { label: t("retry"), onClick: preload },
          });
        });
    };
    preload();
    return () => {
      cancelled = true;
    };
  }, [track.audioUrl, t]);



  const handleCapture = (sentenceId: string) => {
    setCapturingSentenceId(sentenceId);
  };

  const currentSentence = track.sentences.find((s) => s.id === capturingSentenceId);

  const saveToVault = async (tags: string[], note: string, difficulty: string) => {
    if (!capturingSentenceId) return;

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: capturingSentenceId,
          tags,
          note,
          difficulty,
        }),
      });

      await requireOkResponse(res, t("saveVaultFailed"));

      toast.success(t("addedToVault"));
      setCaptureHandoffVisible(true);
      recordDemoEvent("saved");
      setCapturingSentenceId(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveVaultFailed"));
    }
  };

  const exportAudio = async () => {
    setIsExporting(true);
    // Exports run ffmpeg server-side and can take a while on long tracks.
    // Refresh the toast with elapsed time so it does not look frozen.
    const toastId = toast.loading(t("exporting"));
    const startedAt = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      toast.loading(t("exportingProgress", { elapsed }), { id: toastId });
    }, 5000);

    try {
      const response = await fetch('/api/audio/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'track', trackId: track.id }),
      });

      await requireOkResponse(response, t("audioExportFailed"));

      await downloadResponseBlob(response, 'DeepListener_Export.mp3');

      toast.success(t("audioExported"), { id: toastId });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : t("audioExportFailed"), { id: toastId });
    } finally {
      clearInterval(progressTimer);
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-full flex-col md:h-full md:min-h-0 md:overflow-hidden">
      <div className="mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 md:mb-4">
        <div className="flex items-center gap-2">
           <h1 className="text-xl font-bold truncate max-w-[300px] md:max-w-md" title={displayTitle}>{displayTitle}</h1>
           <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} title={t("renameTrack")} aria-label={t("renameTrack")}>
             <Edit3 className="h-4 w-4 text-muted-foreground" />
           </Button>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" asChild>
              <Link href={`/vault?trackId=${track.id}`}>{t("viewNotes")}</Link>
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={exportAudio}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? t("exporting") : t("exportAudio")}
            </Button>

            <Button
              variant="default"
              disabled={!fullAudioBuffer} // 只有加载完了才能进跟读
              onClick={() => { setShadowIndex(0); setShadowingMode(true); }}
            >
              {fullAudioBuffer ? <Mic2 className="h-4 w-4 mr-2" /> : <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {fullAudioBuffer ? t("startShadowing") : t("loadingAudio")}
            </Button>

            <Button
              variant={blindMode ? "default" : "outline"}
              onClick={() => setBlindMode(!blindMode)}
              size="sm"
              title={blindMode ? t("showTranscription") : t("hideTranscription")}
              aria-label={blindMode ? t("showTranscription") : t("hideTranscription")}
              aria-pressed={blindMode}
            >
              {blindMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{blindMode ? t("showTranscription") : t("hideTranscription")}</span>
            </Button>
        </div>
      </div>

      {demoMode && <DemoJourneyPanel state={demoJourney} />}

      {captureHandoffVisible && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100" role="status" aria-live="polite">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">{t("captureHandoff")}</span>
          <Link className="font-semibold underline underline-offset-2" href={`/vault?trackId=${track.id}`}>
            {t("openTrackVault")}
          </Link>
          <Link className="font-semibold underline underline-offset-2" href="/review">
            {t("openReview")}
          </Link>
          <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-emerald-900 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-500/20" onClick={() => setCaptureHandoffVisible(false)}>
            {t("dismissHandoff")}
          </Button>
        </div>
      )}

      <div className="grid flex-1 gap-3 md:min-h-0 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] md:gap-4">
      {shouldRenderBackgroundAudioPlayer(shadowingMode) && (
        <div className="flex min-h-[480px] flex-col md:min-h-0 [&>div]:min-h-0 [&>div]:flex-1">
        <AudioPlayer
          audioUrl={track.audioUrl}
          videoUrl={track.videoUrl}
          audioBuffer={fullAudioBuffer}
          sentences={track.sentences}
          onCapture={handleCapture}
          blindMode={blindMode}
          onPlay={() => recordDemoEvent("played")}
          onReveal={() => recordDemoEvent("revealed")}
          onSentenceSelected={() => recordDemoEvent("sentenceSelected")}
          onShadowing={(index) => {
            setShadowIndex(index);
            setShadowingMode(true);
          }}
        />
        </div>
      )}

      {shouldRenderTrackNotes(shadowingMode) && (
        <div className="h-[260px] min-h-0 md:h-full">
          <NoteEditor
            trackId={track.id}
            initialNote={note}
            onSaved={(content) => setNote(content)}
          />
        </div>
      )}
      </div>
      </div>

      <DiagnosisModal
        key={capturingSentenceId ?? "closed"}
        isOpen={!!capturingSentenceId}
        onClose={() => setCapturingSentenceId(null)}
        sentenceText={currentSentence?.text || ""}
        onSave={saveToVault}
        initialTags={currentSentence?.reviewItem?.tags?.map((t) => t.name) || []}
        initialNote={currentSentence?.reviewItem?.userNote || ""}
        initialDifficulty={currentSentence?.reviewItem?.difficulty || "NORMAL"}
        shouldDefaultVocab={!currentSentence?.reviewItem}
      />

      <RenameTrackModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        track={track}
        onRenamed={() => router.refresh()}
      />

      {shadowingMode && fullAudioBuffer && (
        <ShadowingConsole
          sentence={track.sentences[shadowIndex]}
          fullAudioBuffer={fullAudioBuffer}
          currentIndex={shadowIndex}
          totalCount={track.sentences.length}
          onClose={() => setShadowingMode(false)}
          onNext={() => setShadowIndex(prev => Math.min(prev + 1, track.sentences.length - 1))}
          onPrev={() => setShadowIndex(prev => Math.max(prev - 1, 0))}
          onCapture={handleCapture}
          onRestart={() => setShadowIndex(0)}
        />
      )}
    </>
  );
}
