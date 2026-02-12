"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useWaveSurfer } from "./audio-player/useWaveSurfer";
import { useAutoScroll } from "./audio-player/useAutoScroll";
import { useAudioInteractions } from "./audio-player/useAudioInteractions";
import { SentenceList } from "./audio-player/SentenceList";
import { PlayerControls } from "./audio-player/PlayerControls";
import { WaveformArea } from "./audio-player/WaveformArea";

interface ReviewItem {
  tags?: { name: string }[];
  userNote?: string;
  difficulty?: string;
}

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  formatting?: string | null;
  reviewItem?: ReviewItem | null;
}

interface AudioPlayerProps {
  audioUrl: string;
  sentences: Sentence[];
  onCapture: (sentenceId: string) => void;
  onShadowing: (index: number) => void;
  blindMode?: boolean;
}

export default function AudioPlayer({
  audioUrl,
  sentences: rawSentences,
  onCapture,
  onShadowing,
  blindMode = false,
}: AudioPlayerProps) {
  
  // 🟢 OPTIMIZATION 1: Stable Sentences Array
  // This was the main cause of lag - creating a new array on every render.
  const sentences = useMemo(() => {
    return rawSentences.map((s, i) => {
      const next = rawSentences[i + 1];
      if (next && s.endTime > next.startTime) {
        return { ...s, endTime: next.startTime - 0.05 };
      }
      return s;
    });
  }, [rawSentences]);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopMode, setLoopMode] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState(25);
  const [debugMode, setDebugMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // 🟢 OPTIMIZATION 2: Auto-scroll logic
  const { listContainerRef, onListScroll, scrollToItem } = useAutoScroll();

  useEffect(() => {
    setRevealedIds(new Set());
  }, [blindMode]);

  // Core Sync Logic
  const syncListToTime = useCallback(
    (time: number, force: boolean = false) => {
      const index = sentences.findIndex(
        (s) => time >= s.startTime - 0.1 && time <= s.endTime + 0.1
      );

      // We only care about transitions or forced jumps
      if (index !== -1) {
        if (index !== activeSentenceIndex) {
          setActiveSentenceIndex(index);
          // 🟢 OPTIMIZATION 3: 'auto' behavior for sentence transitions
          // Smooth scrolling during a React render is a thread killer.
          scrollToItem(index, force); 
        } else if (force) {
          scrollToItem(index, true);
        }
      }
    },
    [sentences, activeSentenceIndex, scrollToItem]
  );

  // WaveSurfer Hook
  const { wavesurferRef, regionsRef } = useWaveSurfer({
    containerRef,
    timelineRef,
    audioUrl,
    zoomLevel,
    playbackRate,
    onTimeUpdate: (time) => {
      // Direct DOM update (High performance)
      if (timeRef.current) {
        timeRef.current.innerText = new Date(time * 1000).toISOString().substring(14, 19);
      }
      syncListToTime(time, false);
    },
    onReady: () => setIsReady(true),
    onRegionUpdateEnd: (region) => {
      setTimeout(() => {
        wavesurferRef.current?.setTime(region.start);
        if (timeRef.current) timeRef.current.innerText = new Date(region.start * 1000).toISOString().substring(14, 19);
        syncListToTime(region.start, true);
        wavesurferRef.current?.play();
      }, 10);
    },
    onInteraction: (time) => {
      if (timeRef.current) timeRef.current.innerText = new Date(time * 1000).toISOString().substring(14, 19);
      syncListToTime(time, true);
    },
  });

  // Callbacks
  const handlePlayPause = useCallback(() => wavesurferRef.current?.playPause(), [wavesurferRef]);
  const handleToggleLoop = useCallback(() => setLoopMode((prev) => !prev), []);
  const handleClearRegions = useCallback(() => regionsRef.current?.clearRegions(), [regionsRef]);

  useAudioInteractions({
    containerRef,
    isReady,
    setZoomLevel,
    onPlayPause: handlePlayPause,
  });

  // Separate Loop Effect
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) return;

    const onTimeUpdate = (time: number) => {
      const activeRegions = regionsRef.current?.getRegions();
      if (activeRegions && activeRegions.length > 0) {
        const region = activeRegions[0];
        if (time >= region.end - 0.05 || time < region.start - 0.5) {
          ws.setTime(region.start);
        }
      }
    };

    ws.on("timeupdate", onTimeUpdate);
    return () => { ws.un("timeupdate", onTimeUpdate); };
  }, [isReady, wavesurferRef, regionsRef]);

  // Handlers
  const handleSentenceClick = useCallback((s: Sentence, index: number) => {
    if (debugMode) console.log(`Sentence ${index}:`, s.text);
    if (blindMode) setRevealedIds((prev) => new Set(prev).add(s.id));
    wavesurferRef.current?.setTime(s.startTime);
    wavesurferRef.current?.play();
    regionsRef.current.clearRegions();
  }, [debugMode, blindMode, wavesurferRef, regionsRef]);

  const handleToggleDebug = useCallback((e: React.MouseEvent) => {
    if (e.altKey) setDebugMode((prev) => !prev);
  }, []);

  const handleShadowing = useCallback((index: number) => {
    wavesurferRef.current?.pause();
    onShadowing(index);
  }, [onShadowing, wavesurferRef]);

  return (
    <div className="flex flex-col gap-0 w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <PlayerControls
        isPlaying={isPlaying}
        timeRef={timeRef}
        duration={isReady ? wavesurferRef.current?.getDuration() || 0 : 0}
        loopMode={loopMode}
        playbackRate={playbackRate}
        onRateChange={setPlaybackRate}
        onTogglePlay={handlePlayPause}
        onToggleLoop={handleToggleLoop}
        onClearRegions={handleClearRegions}
        onToggleDebug={handleToggleDebug}
      />

      <WaveformArea containerRef={containerRef} timelineRef={timelineRef} />

      <SentenceList
        sentences={sentences}
        activeSentenceIndex={activeSentenceIndex}
        blindMode={blindMode}
        revealedIds={revealedIds}
        debugMode={debugMode}
        listContainerRef={listContainerRef}
        onScroll={onListScroll}
        onSentenceClick={handleSentenceClick}
        onShadowing={handleShadowing}
        onCapture={onCapture}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}