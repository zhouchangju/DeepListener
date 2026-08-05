import { Play, Pause, SkipBack, SkipForward, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface BatchPlaybackState {
  isActive: boolean;
  isPaused: boolean;
  currentIndex: number;
  currentTrackId: string | null;
}

export interface BatchAudioPlayerProps {
  state: BatchPlaybackState;
  totalTracks: number;
  currentTrackTitle: string | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkipPrev: () => void;
  onSkipNext: () => void;
}

export default function BatchAudioPlayer({
  state,
  totalTracks,
  currentTrackTitle,
  onPause,
  onResume,
  onStop,
  onSkipPrev,
  onSkipNext,
}: BatchAudioPlayerProps) {
  const t = useTranslations("library");
  if (!state.isActive) return null;

  const isGap = state.currentTrackId === null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isGap ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("gapLabel")} ({state.currentIndex + 1}/{totalTracks})
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm font-medium truncate">
                      {currentTrackTitle || t("trackFallback", { index: state.currentIndex + 1 })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ({state.currentIndex + 1} / {totalTracks})
                  </p>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("loopModeLabel")}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onSkipPrev}
              disabled={isGap}
              title={t("prevTrack")}
              aria-label={t("prevTrack")}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {state.isPaused || isGap ? (
              <Button
                size="icon"
                onClick={onResume}
                disabled={isGap}
                title={t("playTitle")}
                aria-label={t("playTitle")}
              >
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={onPause}
                title={t("pauseTitle")}
                aria-label={t("pauseTitle")}
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={onSkipNext}
              disabled={isGap}
              title={t("nextTrack")}
              aria-label={t("nextTrack")}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              size="icon"
              variant="ghost"
              onClick={onStop}
              title={t("stopTitle")}
              aria-label={t("stopTitle")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
