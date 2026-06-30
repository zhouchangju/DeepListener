import { Button } from "@/components/ui/button";
import { Play, Pause, Repeat, Eraser } from "lucide-react";
import { memo, RefObject } from "react";
import SpeedSelector from "../SpeedSelector";

interface PlayerControlsProps {
  isPlaying: boolean;
  timeRef: RefObject<HTMLSpanElement | null>; // Changed from currentTime number
  duration: number;
  loopMode: boolean;
  playbackRate: number;
  onRateChange: (rate: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onClearRegions: () => void;
  onToggleDebug: (e: React.MouseEvent) => void;
}

export const PlayerControls = memo(function PlayerControls({
  isPlaying,
  timeRef,
  duration,
  loopMode,
  playbackRate,
  onRateChange,
  onTogglePlay,
  onToggleLoop,
  onClearRegions,
  onToggleDebug,
}: PlayerControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 bg-muted/60 border-b border-border gap-4">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <Button
          variant="default"
          size="icon"
          className="bg-indigo-600 hover:bg-indigo-700 h-12 w-12 rounded-full shrink-0"
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
        </Button>
        <div className="flex flex-col overflow-hidden" onClick={onToggleDebug}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-help">
            Position
          </span>
          <span className="text-xl sm:text-2xl font-mono text-foreground truncate">
            <span ref={timeRef}>00:00</span>
            <span className="text-muted-foreground text-lg">
              {" "}
              / {new Date(duration * 1000).toISOString().substring(14, 19)}
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <SpeedSelector playbackRate={playbackRate} onRateChange={onRateChange} />
        <Button
          variant={loopMode ? "default" : "outline"}
          size="sm"
          className={`h-9 rounded-full px-4 ${
            loopMode ? "bg-indigo-600 border-transparent text-white hover:bg-indigo-700" : "text-muted-foreground"
          }`}
          onClick={onToggleLoop}
        >
          <Repeat className="h-4 w-4 mr-2" />
          <span className="text-xs font-bold uppercase">Loop</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearRegions}
          className="h-9 rounded-full text-muted-foreground hover:text-red-500"
        >
          <Eraser className="h-4 w-4 mr-2" /> Clear
        </Button>
      </div>
    </div>
  );
});
