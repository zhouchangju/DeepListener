"use client";

import { Button } from "@/components/ui/button";
import { Mic, Play, RotateCcw, SkipForward, X, Loader2, Repeat, Pause } from "lucide-react";
import MiniWavePlayer from "./MiniWavePlayer";
import { useShadowingWorkflow } from "./shadowing/useShadowingWorkflow";
import SpeedSelector from "./SpeedSelector";
import { useState, useEffect } from "react";
import { InteractiveText } from "./notation/InteractiveText";
import { NotationToolbar } from "./notation/NotationToolbar";
import { NotationType, SentenceFormatting } from "./notation/types";

interface ShadowingConsoleProps {
  sentence: { id: string; text: string; startTime: number; endTime: number; formatting?: string | null };
  fullAudioBuffer: AudioBuffer;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ShadowingConsole({
  sentence,
  fullAudioBuffer,
  currentIndex,
  totalCount,
  onClose,
  onNext,
  onPrev,
}: ShadowingConsoleProps) {
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeTool, setActiveTool] = useState<NotationType | null>(null);
  const [localFormatting, setLocalFormatting] = useState<SentenceFormatting>({});

  const { mode, originalBlob, userBlob, isLooping, startFlow, handleRecAgain, stopAll, toggleLoop } = useShadowingWorkflow({
    sentence,
    fullAudioBuffer,
    playbackRate,
  });

  // Load formatting when sentence changes
  useEffect(() => {
    if (sentence.formatting) {
      try {
        setLocalFormatting(JSON.parse(sentence.formatting));
      } catch {
        setLocalFormatting({});
      }
    } else {
      setLocalFormatting({});
    }
  }, [sentence.id, sentence.formatting]);

  // Auto-save formatting
  useEffect(() => {
    const timer = setTimeout(async () => {
      const currentJSON = JSON.stringify(localFormatting);
      if (currentJSON === sentence.formatting || (!sentence.formatting && currentJSON === "{}")) return;

      try {
        await fetch(`/api/sentence/${sentence.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formatting: currentJSON }),
        });
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [localFormatting, sentence.id, sentence.formatting]);

  const handleNext = () => {
    stopAll();
    if (currentIndex < totalCount - 1) onNext();
  };

  const handlePrev = () => {
    stopAll();
    if (currentIndex > 0) onPrev();
  };

  const handleClose = () => {
    stopAll();
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, totalCount]); // Re-bind when index changes to ensure latest state

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">Shadowing Mode</h2>
            <div className="text-sm font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
              {currentIndex + 1} / {totalCount}
            </div>
            <SpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} variant="minimal" />
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col items-center p-8 space-y-8 w-full relative">
          <div className="flex-grow flex flex-col items-center justify-center w-full relative gap-8">
            <InteractiveText
              text={sentence.text}
              formatting={localFormatting}
              mode="edit"
              activeTool={activeTool}
              onChange={setLocalFormatting}
              className="text-2xl font-medium text-slate-700 leading-loose text-center max-w-xl"
            />
            
            <NotationToolbar activeTool={activeTool} onToolChange={setActiveTool} />
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
                    key={sentence.id + "-original"} // Force reset on change
                    audioBlob={originalBlob}
                    label="Original"
                    waveColor="#94a3b8"
                    progressColor="#475569"
                    playbackRate={playbackRate}
                    RightAction={
                       <Button 
                        size="icon" 
                        variant={isLooping ? "default" : "secondary"}
                        className={`rounded-full h-10 w-10 shrink-0 shadow-sm ${isLooping ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white hover:bg-slate-100"}`}
                        onClick={toggleLoop}
                        title="Loop Playback"
                       >
                          {isLooping ? <Pause className="h-4 w-4" /> : <Repeat className="h-4 w-4 text-slate-700" />}
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
                  className="gap-2 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                  onClick={handleRecAgain}
                >
                  <RotateCcw className="h-4 w-4" /> Restart
                </Button>
              </div>
            )}

            {mode === "reviewing" && originalBlob && userBlob && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <MiniWavePlayer
                  key={sentence.id + "-original-review"}
                  audioBlob={originalBlob}
                  label="Original"
                  waveColor="#94a3b8"
                  progressColor="#475569"
                  playbackRate={playbackRate}
                  RightAction={
                       <Button 
                        size="icon" 
                        variant={isLooping ? "default" : "secondary"}
                        className={`rounded-full h-10 w-10 shrink-0 shadow-sm ${isLooping ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white hover:bg-slate-100"}`}
                        onClick={toggleLoop}
                       >
                          {isLooping ? <Pause className="h-4 w-4" /> : <Repeat className="h-4 w-4 text-slate-700" />}
                       </Button>
                  }
                />
                <MiniWavePlayer
                  key={sentence.id + "-user"}
                  audioBlob={userBlob}
                  label="Your Voice"
                  waveColor="#fca5a5"
                  progressColor="#e11d48"
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="h-16 flex items-center justify-center w-full relative">
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
                <Button size="lg" onClick={handleNext} className="gap-2">
                  Next <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex justify-between border-t">
          <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>
            Previous
          </Button>
          <div className="text-slate-400 text-sm flex items-center">
            {mode === "reviewing" ? "Compare waveforms & audio" : "Listen -> Record -> Compare"}
          </div>
          <Button variant="ghost" onClick={handleNext} disabled={currentIndex === totalCount - 1}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}