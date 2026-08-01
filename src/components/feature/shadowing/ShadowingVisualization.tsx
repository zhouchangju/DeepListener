"use client";

import { Button } from "@/components/ui/button";
import { Mic, RotateCcw, Loader2, Repeat, Pause } from "lucide-react";
import { useTranslations } from "next-intl";
import MiniWavePlayer from "../MiniWavePlayer";
import { shouldRenderOriginalWavePlayer, type ShadowingWorkflowMode } from "./presentation";

interface ShadowingVisualizationProps {
  sentenceId: string;
  mode: ShadowingWorkflowMode;
  originalBlob: Blob | null;
  isOriginalBlobReady: boolean;
  userBlob: Blob | null;
  playbackRate: number;
  isLooping: boolean;
  onRecAgain: () => void;
  onToggleLoop: () => void;
}

export default function ShadowingVisualization({
  sentenceId,
  mode,
  originalBlob,
  isOriginalBlobReady,
  userBlob,
  playbackRate,
  isLooping,
  onRecAgain,
  onToggleLoop,
}: ShadowingVisualizationProps) {
  const t = useTranslations("feature.shadowingConsole");
  return (
    <div className="w-full space-y-4">
      {!isOriginalBlobReady && !originalBlob && (
        <div className="flex items-center justify-center text-muted-foreground gap-2 h-32">
          <Loader2 className="h-6 w-6 animate-spin" /> {t("loadingSegment")}
        </div>
      )}

      {shouldRenderOriginalWavePlayer(mode, !!originalBlob) && originalBlob && (
        <div className={mode === "reviewing" ? "" : "opacity-80"}>
          <MiniWavePlayer
            audioBlob={originalBlob}
            label={t("originalLabel")}
            waveColor="#94a3b8"
            progressColor="#475569"
            playbackRate={playbackRate}
            enableRegions={true}
            loop={isLooping}
            RightAction={
              <Button
                size="icon"
                variant={isLooping ? "default" : "secondary"}
                className={`rounded-full h-10 w-10 shrink-0 shadow-sm ${isLooping ? "bg-primary hover:bg-primary" : "bg-background hover:bg-accent"}`}
                onClick={onToggleLoop}
                title={t("loopPlayback")}
              >
                {isLooping ? <Pause className="h-4 w-4" /> : <Repeat className="h-4 w-4 text-foreground" />}
              </Button>
            }
          />
        </div>
      )}

      {mode === "recording" && (
        <div className="h-20 flex items-center justify-center gap-4">
          <div className="flex items-center justify-center text-destructive animate-pulse font-bold text-lg gap-2 bg-destructive/10 rounded-lg border border-destructive/20 px-6 py-2">
            <Mic className="h-6 w-6" /> {t("recording")}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
            onClick={onRecAgain}
          >
            <RotateCcw className="h-4 w-4" /> {t("restart")}
          </Button>
        </div>
      )}

      {mode === "reviewing" && userBlob && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <MiniWavePlayer
            key={`${sentenceId}-user`}
            audioBlob={userBlob}
            label={t("yourVoice")}
            waveColor="#fca5a5"
            progressColor="#e11d48"
            autoPlay={true}
          />
        </div>
      )}
    </div>
  );
}
