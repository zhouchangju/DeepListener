import { useEffect, useEffectEvent, useRef, useState, RefObject } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import Minimap from "wavesurfer.js/dist/plugins/minimap.js";

interface Region {
  id: string;
  start: number;
  end: number;
  color: string;
}

interface UseWaveSurferProps {
  containerRef: RefObject<HTMLDivElement | null>;
  timelineRef: RefObject<HTMLDivElement | null>;
  audioUrl: string;
  mediaRef?: RefObject<HTMLMediaElement | null>;
  peaks?: Array<Float32Array | number[]>;
  mediaDuration?: number;
  zoomLevel: number;
  loopMode: boolean;
  playbackRate: number;
  onTimeUpdate: (time: number) => void;
  onReady: () => void;
  onRegionUpdateEnd: (region: Region) => void;
  onInteraction: (time: number) => void;
}

export function useWaveSurfer({
  containerRef,
  timelineRef,
  audioUrl,
  mediaRef,
  peaks,
  mediaDuration,
  zoomLevel,
  loopMode,
  playbackRate,
  onTimeUpdate,
  onReady,
  onRegionUpdateEnd,
  onInteraction,
}: UseWaveSurferProps) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const playbackRateRef = useRef(playbackRate);
  const zoomLevelRef = useRef(zoomLevel);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  const handleReady = useEffectEvent(() => {
    onReady();
  });

  const handleTimeUpdate = useEffectEvent((time: number) => {
    onTimeUpdate(time);
  });

  const handleRegionUpdateEnd = useEffectEvent((region: Region) => {
    onRegionUpdateEnd(region);
  });

  const handleInteraction = useEffectEvent((time: number) => {
    onInteraction(time);
  });

  useEffect(() => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    if (!container || !timeline) return;
    if (mediaRef && !peaks) return;

    const ws = WaveSurfer.create({
      container,
      media: mediaRef?.current ?? undefined,
      peaks,
      duration: mediaDuration,
      waveColor: "#cbd5e1",
      progressColor: "#4f46e5",
      cursorColor: "#f43f5e",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      height: 100,
      minPxPerSec: zoomLevelRef.current,
      autoCenter: true,
      plugins: [
        TimelinePlugin.create({ container: timeline }),
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

    regions.on("region-updated", (region) => handleRegionUpdateEnd(region as Region));

    // Playback Events
    ws.on("ready", () => {
      setIsReady(true);
      ws.setPlaybackRate(playbackRateRef.current);
      handleReady();
    });
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("timeupdate", handleTimeUpdate);
    ws.on("interaction", handleInteraction);

    if (!mediaRef?.current) {
      ws.load(audioUrl).catch((e) => {
        if (e.name !== "AbortError") console.error("WaveSurfer load error:", e);
      });
    }

    wavesurferRef.current = ws;

    return () => {
      setIsReady(false);
      setIsPlaying(false);
      wavesurferRef.current = null;
      regionsRef.current = null;
      ws.unAll();
      setTimeout(() => {
        try {
          ws.destroy();
        } catch {
          // Ignore errors during cleanup - WaveSurfer may already be destroyed
        }
      }, 0);
    };
  }, [audioUrl, containerRef, timelineRef, mediaRef, peaks, mediaDuration]);

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

  // Sync full-track loop mode with the underlying media element.
  useEffect(() => {
    const media = wavesurferRef.current?.getMediaElement();
    if (!media || !isReady) return;

    media.loop = loopMode;

    return () => {
      media.loop = false;
    };
  }, [loopMode, isReady]);

  return { wavesurferRef, regionsRef, isPlaying, isReady };
}
