"use client";

import { useEffect, useRef, useState } from "react";
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
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const loopRef = useRef(loop);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRegion, setHasRegion] = useState(false);

  // Keep loopRef in sync with loop prop
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
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
        color: "rgba(79, 70, 229, 0.2)",
      });
      regionsRef.current = regions;

      regions.on("region-created", (region) => {
        // Remove other regions to keep only one loop
        regions.getRegions().forEach((r) => {
          if (r.id !== region.id) r.remove();
        });
        setHasRegion(true);
        region.play(); // Auto play when created
      });

      regions.on("region-removed", () => {
        if (regions.getRegions().length === 0) setHasRegion(false);
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
    
    ws.setPlaybackRate(playbackRate); // Set initial rate
    wavesurferRef.current = ws;

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => {
      setIsPlaying(false);
      // Loop the entire audio if loop is enabled and no region is active
      if (loopRef.current && !hasRegion) {
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
      // Revoke object URL to prevent memory leak
      if (typeof audioBlob !== 'string') {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioBlob, height, waveColor, progressColor, enableRegions, autoPlay]); // Removed playbackRate from dependency to avoid recreation

  const togglePlay = () => wavesurferRef.current?.playPause();
  
  const clearRegions = () => {
    regionsRef.current?.clearRegions();
    setHasRegion(false);
  };

  return (
    <div className="flex items-center gap-4 w-full bg-slate-50 p-3 rounded-lg border border-slate-100 relative group">
      <Button 
        size="icon" 
        variant="secondary" 
        className="rounded-full h-10 w-10 shrink-0 bg-white shadow-sm hover:bg-slate-100"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-4 w-4 text-slate-700" /> : <Play className="h-4 w-4 ml-0.5 text-slate-700" />}
      </Button>
      
      <div className="flex-grow flex flex-col gap-1 relative">
        {label && <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>}
        <div ref={containerRef} className="w-full" />
        
        {/* Clear Region Button */}
        {hasRegion && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10 opacity-80 hover:opacity-100"
            onClick={clearRegions}
            title="Clear Selection"
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
