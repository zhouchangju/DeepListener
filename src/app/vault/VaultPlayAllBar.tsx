"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play, SkipForward, X } from "lucide-react";
import type { VaultPlaybackItem } from "./vault-items";

interface VaultPlayAllBarProps {
  items: VaultPlaybackItem[];
  playAllIndex: number;
  playAllPaused: boolean;
  onResume: () => void;
  onPause: () => void;
  onNext: () => void;
  onStop: () => void;
}

export function VaultPlayAllBar({
  items,
  playAllIndex,
  playAllPaused,
  onResume,
  onPause,
  onNext,
  onStop,
}: VaultPlayAllBarProps) {
  const currentItem = items[playAllIndex];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg px-4 py-3">
      <div className="container mx-auto flex items-center gap-4">
        <span className="text-sm font-medium text-gray-500 flex-shrink-0">
          {playAllIndex + 1} / {items.length}
        </span>
        <div className="flex-grow min-w-0">
          {currentItem && (
            <>
              <p className="text-xs text-gray-400 truncate">{currentItem.sentence.track.title}</p>
              <p className="text-sm font-medium text-gray-800 truncate">{currentItem.sentence.text}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {playAllPaused ? (
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onResume}>
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={onNext}
            disabled={playAllIndex >= items.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={onStop}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
