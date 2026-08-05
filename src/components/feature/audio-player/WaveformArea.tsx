import { MousePointer2, Hand, ZoomIn } from "lucide-react";
import { RefObject, memo } from "react";
import { useTranslations } from "next-intl";

interface WaveformAreaProps {
  containerRef: RefObject<HTMLDivElement | null>;
  timelineRef: RefObject<HTMLDivElement | null>;
}

export const WaveformArea = memo(function WaveformArea({ containerRef, timelineRef }: WaveformAreaProps) {
  const t = useTranslations("feature.audioPlayer");

  return (
    <div className="p-4 sm:p-6 bg-card">
      <div ref={timelineRef} className="mb-2 opacity-80" />
      <div
        ref={containerRef}
        className="w-full cursor-crosshair overflow-x-hidden rounded-lg bg-muted/40 border border-border"
      />
      <div className="mt-4 hidden sm:flex justify-between items-center text-[11px] text-muted-foreground px-1 font-medium">
        <div className="flex gap-6">
          <span>
            <MousePointer2 className="h-3 w-3 inline mr-1" /> {t("waveformSelect")}
          </span>
          <span>
            <Hand className="h-3 w-3 inline mr-1" /> {t("waveformPan")}
          </span>
          <span>
            <ZoomIn className="h-3 w-3 inline mr-1" /> {t("waveformZoom")}
          </span>
        </div>
        <span className="uppercase tracking-tighter">{t("keyboardPlayPause")}</span>
      </div>
    </div>
  );
});
