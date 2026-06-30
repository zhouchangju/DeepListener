"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useWaveSurfer } from "./audio-player/useWaveSurfer";
import { useAutoScroll } from "./audio-player/useAutoScroll";
import { useAudioInteractions } from "./audio-player/useAudioInteractions";
import { getPlayerControlsState } from "./audio-player/presentation";
import { SentenceList } from "./audio-player/SentenceList";
import { PlayerControls } from "./audio-player/PlayerControls";
import { WaveformArea } from "./audio-player/WaveformArea";

interface ReviewItem {
  tags?: { name: string }[];
  userNote?: string | null;
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
    const timer = window.setTimeout(() => {
      setRevealedIds(new Set());
    }, 0);

    return () => window.clearTimeout(timer);
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
  const { wavesurferRef, regionsRef, isPlaying: waveSurferIsPlaying } = useWaveSurfer({
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

  const playerControlsState = getPlayerControlsState({
    isPlaying: waveSurferIsPlaying,
    isReady,
    duration: wavesurferRef.current?.getDuration(),
  });

  // Callbacks
  const handlePlayPause = () => wavesurferRef.current?.playPause();
  const handleToggleLoop = () => setLoopMode((prev) => !prev);
  const handleClearRegions = () => regionsRef.current?.clearRegions();

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
  const handleSentenceClick = (s: Sentence, index: number) => {
    if (debugMode) console.log(`Sentence ${index}:`, s.text);
    if (blindMode) {
      setRevealedIds((prev) => {
        const nextIds = new Set(prev);
        nextIds.add(s.id);
        return nextIds;
      });
    }
    wavesurferRef.current?.setTime(s.startTime);
    wavesurferRef.current?.play();
    regionsRef.current?.clearRegions();
  };

  const handleToggleDebug = (e: React.MouseEvent) => {
    if (e.altKey) setDebugMode((prev) => !prev);
  };

  const handleShadowing = (index: number) => {
    wavesurferRef.current?.pause();
    onShadowing(index);
  };

  return (
    <div className="flex flex-col gap-0 w-full max-w-5xl mx-auto bg-card text-card-foreground rounded-2xl shadow-xl shadow-slate-200/60 border border-border overflow-hidden dark:shadow-black/30">
      <PlayerControls
        isPlaying={playerControlsState.isPlaying}
        timeRef={timeRef}
        duration={playerControlsState.duration}
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
    </div>
  );
}
