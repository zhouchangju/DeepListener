import { Button } from "@/components/ui/button";
import { Play, Pause, Repeat, Eraser } from "lucide-react";
import { memo } from "react";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loopMode: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onClearRegions: () => void;
  onToggleDebug: (e: React.MouseEvent) => void;
}

export const PlayerControls = memo(function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  loopMode,
  onTogglePlay,
  onToggleLoop,
  onClearRegions,
  onToggleDebug,
}: PlayerControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 bg-slate-50 border-b border-slate-200 gap-4">
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
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-help">
            Position
          </span>
          <span className="text-xl sm:text-2xl font-mono text-slate-700 truncate">
            {new Date(currentTime * 1000).toISOString().substr(14, 5)}
            <span className="text-slate-300 text-lg">
              {" "}
              / {new Date(duration * 1000).toISOString().substr(14, 5)}
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          variant={loopMode ? "default" : "outline"}
          size="sm"
          className={`h-9 rounded-full px-4 ${
            loopMode ? "bg-indigo-600 border-transparent text-white" : "text-slate-600"
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
          className="h-9 rounded-full text-slate-400 hover:text-red-500"
        >
          <Eraser className="h-4 w-4 mr-2" /> Clear
        </Button>
      </div>
    </div>
  );
});