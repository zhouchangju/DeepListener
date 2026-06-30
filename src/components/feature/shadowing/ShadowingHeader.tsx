"use client";

import { Button } from "@/components/ui/button";
import { Mic, X, Bookmark, BookmarkCheck, Eye, EyeOff, Keyboard } from "lucide-react";
import SpeedSelector from "../SpeedSelector";
import { getPracticeModeButtonClassName, type ShadowingPracticeMode } from "./presentation";

interface ShadowingHeaderProps {
  practiceMode: ShadowingPracticeMode;
  currentIndex: number;
  totalCount: number;
  playbackRate: number;
  blindMode: boolean;
  isBookmarked: boolean;
  onPracticeModeChange: (mode: ShadowingPracticeMode) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleBlindMode: () => void;
  onCapture: () => void;
  onClose: () => void;
}

export default function ShadowingHeader({
  practiceMode,
  currentIndex,
  totalCount,
  playbackRate,
  blindMode,
  isBookmarked,
  onPracticeModeChange,
  onPlaybackRateChange,
  onToggleBlindMode,
  onCapture,
  onClose,
}: ShadowingHeaderProps) {
  return (
    <div className="flex justify-between items-center p-6 border-b border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">
          {practiceMode === "shadowing" ? (
            <>Shadowing Mode(<span style={{ color: "red" }}>抓主谓宾/Chunk</span>)</>
          ) : (
            "Dictation Mode"
          )}
        </h2>
        <div className="text-sm font-medium px-3 py-1 bg-muted rounded-full text-muted-foreground">
          {currentIndex + 1} / {totalCount}
        </div>
        <div className="flex rounded-xl bg-muted p-1.5 ring-1 ring-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={getPracticeModeButtonClassName("shadowing", practiceMode)}
            aria-pressed={practiceMode === "shadowing"}
            onClick={() => onPracticeModeChange("shadowing")}
          >
            <Mic className="h-4 w-4" />
            Shadowing
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={getPracticeModeButtonClassName("dictation", practiceMode)}
            aria-pressed={practiceMode === "dictation"}
            onClick={() => onPracticeModeChange("dictation")}
          >
            <Keyboard className="h-4 w-4" />
            Dictation
          </Button>
        </div>
        <SpeedSelector playbackRate={playbackRate} onRateChange={onPlaybackRateChange} variant="minimal" />
        {practiceMode === "shadowing" && (
          <Button
            variant="ghost"
            size="icon"
            className={blindMode ? "bg-indigo-100 text-indigo-600" : "text-muted-foreground hover:text-indigo-600"}
            onClick={onToggleBlindMode}
            title={blindMode ? "Show text" : "Hide text"}
          >
            {blindMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={isBookmarked ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-indigo-600"}
          onClick={onCapture}
        >
          {isBookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </Button>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="h-6 w-6" />
      </Button>
    </div>
  );
}
