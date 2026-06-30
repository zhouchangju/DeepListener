"use client";

import { Button } from "@/components/ui/button";
import { Mic, RotateCcw, Loader2, Repeat, Pause } from "lucide-react";
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
  return (
    <div className="w-full space-y-4">
      {!isOriginalBlobReady && !originalBlob && (
        <div className="flex items-center justify-center text-muted-foreground gap-2 h-32">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading audio segment...
        </div>
      )}

      {shouldRenderOriginalWavePlayer(mode, !!originalBlob) && originalBlob && (
        <div className={mode === "reviewing" ? "" : "opacity-80"}>
          <MiniWavePlayer
            audioBlob={originalBlob}
            label="Original"
            waveColor="#94a3b8"
            progressColor="#475569"
            playbackRate={playbackRate}
            enableRegions={true}
            loop={isLooping}
            RightAction={
              <Button
                size="icon"
                variant={isLooping ? "default" : "secondary"}
                className={`rounded-full h-10 w-10 shrink-0 shadow-sm ${isLooping ? "bg-indigo-600 hover:bg-indigo-700" : "bg-background hover:bg-accent"}`}
                onClick={onToggleLoop}
                title="Loop Playback"
              >
                {isLooping ? <Pause className="h-4 w-4" /> : <Repeat className="h-4 w-4 text-foreground" />}
              </Button>
            }
          />
        </div>
      )}

      {mode === "recording" && (
        <div className="h-20 flex items-center justify-center gap-4">
          <div className="flex items-center justify-center text-red-500 animate-pulse font-bold text-lg gap-2 bg-red-50 rounded-lg border border-red-100 px-6 py-2">
            <Mic className="h-6 w-6" /> Recording...
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border text-muted-foreground hover:text-red-600 hover:border-red-200"
            onClick={onRecAgain}
          >
            <RotateCcw className="h-4 w-4" /> Restart
          </Button>
        </div>
      )}

      {mode === "reviewing" && userBlob && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <MiniWavePlayer
            key={`${sentenceId}-user`}
            audioBlob={userBlob}
            label="Your Voice"
            waveColor="#fca5a5"
            progressColor="#e11d48"
            autoPlay={true}
          />
        </div>
      )}
    </div>
  );
}
