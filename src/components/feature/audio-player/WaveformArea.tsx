import { MousePointer2, Hand, ZoomIn } from "lucide-react";
import { RefObject, memo } from "react";

interface WaveformAreaProps {
  containerRef: RefObject<HTMLDivElement | null>;
  timelineRef: RefObject<HTMLDivElement | null>;
}

export const WaveformArea = memo(function WaveformArea({ containerRef, timelineRef }: WaveformAreaProps) {
  return (
    <div className="p-4 sm:p-6 bg-white">
      <div ref={timelineRef} className="mb-2 opacity-80" />
      <div
        ref={containerRef}
        className="w-full cursor-crosshair overflow-x-hidden rounded-lg bg-slate-50/50 border border-slate-100"
      />
      <div className="mt-4 hidden sm:flex justify-between items-center text-[11px] text-slate-400 px-1 font-medium">
        <div className="flex gap-6">
          <span>
            <MousePointer2 className="h-3 w-3 inline mr-1" /> Left-Drag: Select
          </span>
          <span>
            <Hand className="h-3 w-3 inline mr-1" /> Right-Drag: Pan
          </span>
          <span>
            <ZoomIn className="h-3 w-3 inline mr-1" /> Scroll: Zoom
          </span>
        </div>
        <span className="uppercase tracking-tighter">Space: Play/Pause</span>
      </div>
    </div>
  );
});
