"use client";

import { Button } from "@/components/ui/button";
import { Play, RotateCcw, SkipForward, Mic } from "lucide-react";

interface ShadowingControlsProps {
  mode: string;
  onStartFlow: () => void;
  onRecAgain: () => void;
  onNext: () => void;
}

export default function ShadowingControls({
  mode,
  onStartFlow,
  onRecAgain,
  onNext,
}: ShadowingControlsProps) {
  return (
    <div className="h-16 flex items-center justify-center w-full relative">
      {mode === "idle" && (
        <Button
          size="lg"
          className="rounded-full px-8 text-lg gap-2 shadow-lg shadow-indigo-200"
          onClick={onStartFlow}
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
          <Button variant="outline" size="lg" onClick={onStartFlow} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Full Retry
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 gap-2"
            onClick={onRecAgain}
          >
            <Mic className="h-4 w-4" /> Rec Again
          </Button>
          <Button size="lg" onClick={onNext} className="gap-2">
            Next <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
