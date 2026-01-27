import { useEffect, useRef, useState, RefObject } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import Minimap from "wavesurfer.js/dist/plugins/minimap.js";

interface UseWaveSurferProps {
  containerRef: RefObject<HTMLDivElement | null>;
  timelineRef: RefObject<HTMLDivElement | null>;
  audioUrl: string;
  zoomLevel: number;
  playbackRate: number;
  onTimeUpdate: (time: number) => void;
  onReady: () => void;
  onRegionUpdateEnd: (region: any) => void;
  onInteraction: (time: number) => void;
}

export function useWaveSurfer({
  containerRef,
  timelineRef,
  audioUrl,
  zoomLevel,
  playbackRate,
  onTimeUpdate,
  onReady,
  onRegionUpdateEnd,
  onInteraction,
}: UseWaveSurferProps) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#cbd5e1",
      progressColor: "#4f46e5",
      cursorColor: "#f43f5e",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      height: 100,
      minPxPerSec: zoomLevel,
      autoCenter: true,
      plugins: [
        TimelinePlugin.create({ container: timelineRef.current }),
        Minimap.create({ height: 20, waveColor: "#eee", progressColor: "#4f46e5" }),
      ],
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;
    regions.enableDragSelection({ color: "rgba(79, 70, 229, 0.15)" });

    // Region Events
    regions.on("region-created", (region) => {
      regions.getRegions().forEach((r) => {
        if (r !== region) r.remove();
      });
    });

    regions.on("region-update-end" as any, onRegionUpdateEnd);

    // Playback Events
    ws.on("ready", () => {
      setIsReady(true);
      ws.setPlaybackRate(playbackRate); // Set initial rate
      onReady();
    });
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("timeupdate", onTimeUpdate);
    ws.on("interaction", onInteraction);

    // Load Audio
    ws.load(audioUrl).catch((e) => {
      if (e.name !== "AbortError") console.error("WaveSurfer load error:", e);
    });

    wavesurferRef.current = ws;

    return () => {
      setIsReady(false);
      ws.unAll();
      setTimeout(() => {
        try {
          ws.destroy();
        } catch (e) {}
      }, 0);
    };
  }, [audioUrl]); // Re-init on URL change only

  // Sync zoom level
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.zoom(zoomLevel);
    }
  }, [zoomLevel, isReady]);

  // Sync playback rate
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, isReady]);

  return { wavesurferRef, regionsRef, isPlaying, isReady };
}