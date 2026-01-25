"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWaveSurfer } from "./audio-player/useWaveSurfer";
import { useAutoScroll } from "./audio-player/useAutoScroll";
import { useAudioInteractions } from "./audio-player/useAudioInteractions";
import { SentenceList } from "./audio-player/SentenceList";
import { PlayerControls } from "./audio-player/PlayerControls";
import { WaveformArea } from "./audio-player/WaveformArea";

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  reviewItem?: any;
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
  // Pre-process sentences
  const sentences = rawSentences.map((s, i) => {
    const next = rawSentences[i + 1];
    if (next && s.endTime > next.startTime) {
      return { ...s, endTime: next.startTime - 0.05 };
    }
    return s;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // State
  const [currentTime, setCurrentTime] = useState(0);
  const [loopMode, setLoopMode] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState(25);
  // Removed local isReady state, will use hook's return
  const [debugMode, setDebugMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Auto-scroll logic
  const { listContainerRef, onListScroll, scrollToItem } = useAutoScroll();

  useEffect(() => {
    setRevealedIds(new Set());
  }, [blindMode]);

  // Core Sync Logic
  const syncListToTime = useCallback(
    (time: number, force: boolean = false) => {
      let index = sentences.findIndex(
        (s) => time >= s.startTime - 0.1 && time <= s.endTime + 0.1
      );

      if (index === -1) {
        if (force) {
          index = sentences.findLastIndex((s) => s.startTime <= time + 0.2);
        } else if (activeSentenceIndex !== -1) {
          const active = sentences[activeSentenceIndex];
          if (time < active.endTime + 1.0) index = activeSentenceIndex;
        }
      }

      if (index !== -1) {
        if (index !== activeSentenceIndex) {
          setActiveSentenceIndex(index);
        }
        scrollToItem(index, force);
      }
    },
    [sentences, activeSentenceIndex, scrollToItem]
  );

  // WaveSurfer Hook
  const { wavesurferRef, regionsRef, isPlaying, isReady } = useWaveSurfer({
    containerRef,
    timelineRef,
    audioUrl,
    zoomLevel,
    onTimeUpdate: (time) => {
      setCurrentTime(time);
      syncListToTime(time, false);
    },
    onReady: () => {}, // State is managed inside the hook now
    onRegionUpdateEnd: (region) => {
      setTimeout(() => {
        wavesurferRef.current?.setTime(region.start);
        setCurrentTime(region.start);
        syncListToTime(region.start, true);
        wavesurferRef.current?.play();
      }, 10);
    },
    onInteraction: (time) => {
      setCurrentTime(time);
      syncListToTime(time, true);
    },
  });

  // Interactions Hook
  useAudioInteractions({
    containerRef,
    isReady,
    setZoomLevel,
    onPlayPause: () => wavesurferRef.current?.playPause(),
  });

  // Loop Logic
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
      } else if (loopMode) {
        const activeSentence = sentences.find(
          (s) => time >= s.startTime && time <= s.endTime
        );
        if (activeSentence && time >= activeSentence.endTime - 0.05) {
          ws.setTime(activeSentence.startTime);
        }
      }
    };

    ws.on("timeupdate", onTimeUpdate);
    return () => {
      ws.un("timeupdate", onTimeUpdate);
    };
  }, [loopMode, isReady, sentences, wavesurferRef, regionsRef]);

  // Handlers
  const handleSentenceClick = (s: Sentence, index: number) => {
    if (debugMode) console.log(`Sentence ${index}:`, s.text);
    if (blindMode) setRevealedIds((prev) => new Set(prev).add(s.id));
    
    wavesurferRef.current?.setTime(s.startTime);
    wavesurferRef.current?.play();
    regionsRef.current.clearRegions();
  };

  const handleToggleDebug = (e: React.MouseEvent) => {
    if (e.altKey) {
      setDebugMode(!debugMode);
      if (!debugMode) {
        console.table(
          sentences.map((s) => ({
            text: s.text.substring(0, 20) + "...",
            start: s.startTime,
            end: s.endTime,
            duration: s.endTime - s.startTime,
          }))
        );
      }
    }
  };

  return (
    <div className="flex flex-col gap-0 w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={isReady ? wavesurferRef.current?.getDuration() || 0 : 0}
        loopMode={loopMode}
        onTogglePlay={() => wavesurferRef.current?.playPause()}
        onToggleLoop={() => setLoopMode(!loopMode)}
        onClearRegions={() => regionsRef.current.clearRegions()}
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
        onShadowing={onShadowing}
        onCapture={onCapture}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}