"use client";

import { Button } from "@/components/ui/button";
import { Mic, Play, RotateCcw, SkipForward, X, Loader2 } from "lucide-react";
import MiniWavePlayer from "./MiniWavePlayer";
import { useShadowingWorkflow } from "./shadowing/useShadowingWorkflow";

interface ShadowingConsoleProps {
  sentence: { text: string; startTime: number; endTime: number };
  fullAudioBuffer: AudioBuffer;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ShadowingConsole({
  sentence,
  fullAudioBuffer,
  onClose,
  onNext,
  onPrev,
}: ShadowingConsoleProps) {
  const { mode, originalBlob, userBlob, startFlow, handleRecAgain } = useShadowingWorkflow({
    sentence,
    fullAudioBuffer,
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">Shadowing Mode</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col items-center p-8 space-y-8 w-full">
          <div className="flex-grow flex items-center justify-center">
            <p className="text-2xl font-medium text-slate-700 leading-loose text-center">
              {sentence.text}
            </p>
          </div>

          {/* Visualization Area */}
          <div className="w-full space-y-4">
            {!originalBlob && (
              <div className="flex items-center justify-center text-slate-400 gap-2 h-32">
                <Loader2 className="h-6 w-6 animate-spin" /> Loading audio segment...
              </div>
            )}

            {(mode === "idle" || mode === "playing_original" || mode === "recording") &&
              originalBlob && (
                <div className="opacity-80">
                  <MiniWavePlayer
                    audioBlob={originalBlob}
                    label="Original"
                    waveColor="#94a3b8"
                    progressColor="#475569"
                  />
                </div>
              )}

            {mode === "recording" && (
              <div className="h-20 flex items-center justify-center text-red-500 animate-pulse font-bold text-lg gap-2 bg-red-50 rounded-lg border border-red-100">
                <Mic className="h-6 w-6" /> Recording...
              </div>
            )}

            {mode === "reviewing" && originalBlob && userBlob && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <MiniWavePlayer
                  audioBlob={originalBlob}
                  label="Original"
                  waveColor="#94a3b8"
                  progressColor="#475569"
                />
                <MiniWavePlayer
                  audioBlob={userBlob}
                  label="Your Voice"
                  waveColor="#fca5a5"
                  progressColor="#e11d48"
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="h-16 flex items-center justify-center">
            {mode === "idle" && (
              <Button
                size="lg"
                className="rounded-full px-8 text-lg gap-2 shadow-lg shadow-indigo-200"
                onClick={startFlow}
              >
                <Play className="h-5 w-5" /> Start Challenge
              </Button>
            )}

            {mode === "playing_original" && (
              <div className="text-indigo-600 animate-pulse font-bold text-lg flex items-center gap-2">
                <Play className="h-6 w-6" /> Listening...
              </div>
            )}

            {mode === "reviewing" && (
              <div className="flex gap-4">
                <Button variant="outline" size="lg" onClick={startFlow} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Full Retry
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 gap-2"
                  onClick={handleRecAgain}
                >
                  <Mic className="h-4 w-4" /> Rec Again
                </Button>
                <Button size="lg" onClick={onNext} className="gap-2">
                  Next <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex justify-between border-t">
          <Button variant="ghost" onClick={onPrev}>
            Previous
          </Button>
          <div className="text-slate-400 text-sm flex items-center">
            {mode === "reviewing" ? "Compare waveforms & audio" : "Listen -> Record -> Compare"}
          </div>
          <Button variant="ghost" onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}