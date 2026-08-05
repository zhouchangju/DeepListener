"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("vault");
  // Clamp the index so a stale playAllIndex (e.g. after the list shrank from
  // a filter/page change) doesn't render an out-of-range fraction like "11/5".
  const safeIndex = Math.min(playAllIndex, Math.max(0, items.length - 1));
  const currentItem = items[safeIndex];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg px-4 py-3">
      <div className="container mx-auto flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
          {items.length === 0 ? "—" : `${safeIndex + 1} / ${items.length}`}
        </span>
        <div className="flex-grow min-w-0">
          {currentItem && (
            <>
              <p className="text-xs text-muted-foreground truncate">{currentItem.sentence.track.title}</p>
              <p className="text-sm font-medium text-foreground truncate">{currentItem.sentence.text}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {playAllPaused ? (
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onResume} title={t("playAllResume")} aria-label={t("playAllResume")}>
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onPause} title={t("playAllPause")} aria-label={t("playAllPause")}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={onNext}
            disabled={safeIndex >= items.length - 1}
            title={t("playAllNext")}
            aria-label={t("playAllNext")}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={onStop} title={t("playAllStop")} aria-label={t("playAllStop")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
