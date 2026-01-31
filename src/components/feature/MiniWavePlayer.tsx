"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface MiniWavePlayerProps {
  audioBlob: Blob | string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  label?: string;
  playbackRate?: number;
  RightAction?: React.ReactNode;
}

export default function MiniWavePlayer({ 
  audioBlob, 
  height = 60, 
  waveColor = "#cbd5e1", 
  progressColor = "#4f46e5",
  label,
  playbackRate = 1,
  RightAction,
}: MiniWavePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

    const url = typeof audioBlob === 'string' ? audioBlob : URL.createObjectURL(audioBlob);
    ws.load(url);
    ws.setPlaybackRate(playbackRate); // Set initial rate
    wavesurferRef.current = ws;

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    return () => {
      ws.destroy();
    };
  }, [audioBlob, height, waveColor, progressColor]);

  const togglePlay = () => wavesurferRef.current?.playPause();

  return (
    <div className="flex items-center gap-4 w-full bg-slate-50 p-3 rounded-lg border border-slate-100">
      <Button 
        size="icon" 
        variant="secondary" 
        className="rounded-full h-10 w-10 shrink-0 bg-white shadow-sm hover:bg-slate-100"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-4 w-4 text-slate-700" /> : <Play className="h-4 w-4 ml-0.5 text-slate-700" />}
      </Button>
      
      <div className="flex-grow flex flex-col gap-1">
        {label && <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>}
        <div ref={containerRef} className="w-full" />
      </div>

      {RightAction && (
        <div className="shrink-0">
            {RightAction}
        </div>
      )}
    </div>
  );
}
