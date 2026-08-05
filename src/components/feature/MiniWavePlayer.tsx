"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { Button } from "@/components/ui/button";
import { Play, Pause, X } from "lucide-react";

interface MiniWavePlayerProps {
  audioBlob: Blob | string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  label?: string;
  playbackRate?: number;
  RightAction?: React.ReactNode;
  enableRegions?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

type MiniWavePlayerSource = Blob | string;

export default function MiniWavePlayer({
  audioBlob,
  height = 60,
  waveColor = "#cbd5e1",
  progressColor = "#4f46e5",
  label,
  playbackRate = 1,
  RightAction,
  enableRegions = false,
  autoPlay = false,
  loop = false,
}: MiniWavePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("feature.audioPlayer");
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const loopRef = useRef(loop);
  const hasRegionRef = useRef(false);
  const playbackRateRef = useRef(playbackRate);
  const [isPlayingState, setIsPlayingState] = useState<{
    source: MiniWavePlayerSource;
    value: boolean;
  }>({
    source: audioBlob,
    value: false,
  });
  const [hasRegionState, setHasRegionState] = useState<{
    source: MiniWavePlayerSource;
    value: boolean;
  }>({
    source: audioBlob,
    value: false,
  });
  const isPlaying = isPlayingState.source === audioBlob ? isPlayingState.value : false;
  const hasRegion = hasRegionState.source === audioBlob ? hasRegionState.value : false;

  // Keep loopRef in sync with loop prop
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  useEffect(() => {
    hasRegionRef.current = false;
    regionsRef.current = null;
    wavesurferRef.current = null;

    if (!containerRef.current) return;

    const resolveColor = (explicit: string, token: string, fallback: string) =>
      explicit || (typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback : fallback);

    const resolvedWaveColor = resolveColor(waveColor, "--border", "#cbd5e1");
    const resolvedProgressColor = resolveColor(progressColor, "--primary", "#4f46e5");

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: resolvedWaveColor,
      progressColor: resolvedProgressColor,
      cursorColor: "transparent", // 隐藏光标，保持简洁
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height,
      normalize: true, // 归一化波形，让录音声音小的时候波形也明显
    });

    if (enableRegions) {
      const regions = ws.registerPlugin(RegionsPlugin.create());
      regions.enableDragSelection({
        color: "color-mix(in oklab, var(--primary) 20%, transparent)",
      });
      regionsRef.current = regions;

      regions.on("region-created", (region) => {
        // Remove other regions to keep only one loop
        regions.getRegions().forEach((r) => {
          if (r.id !== region.id) r.remove();
        });
        hasRegionRef.current = true;
        setHasRegionState({
          source: audioBlob,
          value: true,
        });
        region.play(); // Auto play when created
      });

      regions.on("region-removed", () => {
        const nextHasRegion = regions.getRegions().length > 0;
        hasRegionRef.current = nextHasRegion;
        if (!nextHasRegion) {
          setHasRegionState({
            source: audioBlob,
            value: false,
          });
        }
      });

      regions.on("region-out", (region) => {
        region.play(); // Loop
      });
    }

    const url = typeof audioBlob === 'string' ? audioBlob : URL.createObjectURL(audioBlob);
    ws.load(url).catch((err) => {
      if (err.name === "AbortError") return;
      console.warn("WaveSurfer load error:", err);
    });
    
    ws.setPlaybackRate(playbackRateRef.current); // Set initial rate
    wavesurferRef.current = ws;

    ws.on("play", () => {
      setIsPlayingState({
        source: audioBlob,
        value: true,
      });
    });
    ws.on("pause", () => {
      setIsPlayingState({
        source: audioBlob,
        value: false,
      });
    });
    ws.on("finish", () => {
      setIsPlayingState({
        source: audioBlob,
        value: false,
      });

      // Loop the entire audio if loop is enabled and no region is active
      if (loopRef.current && !hasRegionRef.current) {
        ws.play();
      }
    });

    if (autoPlay) {
      ws.on('ready', () => {
        ws.play();
      });
    }

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsRef.current = null;
      hasRegionRef.current = false;

      // Revoke object URL to prevent memory leak
      if (typeof audioBlob !== 'string') {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioBlob, height, waveColor, progressColor, enableRegions, autoPlay]);

  const togglePlay = () => wavesurferRef.current?.playPause();
  
  const clearRegions = () => {
    regionsRef.current?.clearRegions();
    hasRegionRef.current = false;
    setHasRegionState({
      source: audioBlob,
      value: false,
    });
  };

  return (
    <div className="flex items-center gap-4 w-full bg-muted/60 p-3 rounded-lg border border-border relative group">
      <Button 
        size="icon" 
        variant="secondary" 
        className="rounded-full h-10 w-10 shrink-0 bg-background shadow-sm hover:bg-accent"
        onClick={togglePlay}
        title={isPlaying ? t("pause") : t("play")}
        aria-label={isPlaying ? t("pause") : t("play")}
      >
        {isPlaying ? <Pause className="h-4 w-4 text-foreground" /> : <Play className="h-4 w-4 ml-0.5 text-foreground" />}
      </Button>
      
      <div className="flex-grow flex flex-col gap-1 relative">
        {label && <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>}
        <div ref={containerRef} className="w-full" />
        
        {/* Clear Region Button */}
        {hasRegion && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10 opacity-80 hover:opacity-100"
            onClick={clearRegions}
            title={t("clearSelection")}
            aria-label={t("clearSelection")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {RightAction && (
        <div className="shrink-0">
            {RightAction}
        </div>
      )}
    </div>
  );
}
