"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VaultPlaybackItem } from "./vault-items";

type TimedAudioElement = HTMLAudioElement & { activeTimer?: ReturnType<typeof setTimeout> };

export function useVaultPlayback(filteredItems: VaultPlaybackItem[]) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playAllActive, setPlayAllActive] = useState(false);
  const [playAllIndex, setPlayAllIndex] = useState(0);
  const [playAllPaused, setPlayAllPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAllIndexRef = useRef(0);

  playAllIndexRef.current = playAllIndex;

  const clearActiveTimer = useCallback(() => {
    const audio = audioRef.current as TimedAudioElement | null;
    if (audio?.activeTimer) clearTimeout(audio.activeTimer);
  }, []);

  useEffect(() => {
    return () => {
      clearActiveTimer();
      audioRef.current?.pause();
    };
  }, [clearActiveTimer]);

  const ensureAudio = useCallback(() => {
    audioRef.current ??= new Audio();
    return audioRef.current as TimedAudioElement;
  }, []);

  const stopPlayAll = useCallback(() => {
    clearActiveTimer();
    audioRef.current?.pause();
    setPlayAllActive(false);
    setPlayAllPaused(false);
    setPlayAllIndex(0);
    setPlayingId(null);
  }, [clearActiveTimer]);

  const playAudio = useCallback(
    (item: VaultPlaybackItem) => {
      if (playAllActive) {
        stopPlayAll();
      }

      const audio = ensureAudio();

      if (playingId === item.id) {
        clearActiveTimer();
        audio.pause();
        setPlayingId(null);
        return;
      }

      clearActiveTimer();
      audio.pause();
      audio.src = item.sentence.track.audioUrl;
      audio.currentTime = item.sentence.startTime;
      audio.play();
      setPlayingId(item.id);

      const duration = (item.sentence.endTime - item.sentence.startTime) * 1000;
      audio.activeTimer = setTimeout(() => {
        setPlayingId((prevId) => {
          if (prevId === item.id) {
            audio.pause();
            return null;
          }
          return prevId;
        });
      }, duration);
    },
    [clearActiveTimer, ensureAudio, playAllActive, playingId, stopPlayAll]
  );

  const playItemAtIndex = useCallback(
    (index: number, items: VaultPlaybackItem[]) => {
      if (index >= items.length) {
        stopPlayAll();
        toast.success(`Finished playing ${items.length} sentences`);
        return;
      }

      const item = items[index];
      const audio = ensureAudio();
      clearActiveTimer();

      audio.src = item.sentence.track.audioUrl;
      audio.currentTime = item.sentence.startTime;
      audio.play().catch(() => {
        stopPlayAll();
      });
      setPlayingId(item.id);
      setPlayAllIndex(index);
      playAllIndexRef.current = index;

      const duration = (item.sentence.endTime - item.sentence.startTime) * 1000;
      audio.activeTimer = setTimeout(() => {
        playItemAtIndex(playAllIndexRef.current + 1, items);
      }, duration);
    },
    [clearActiveTimer, ensureAudio, stopPlayAll]
  );

  const startPlayAll = useCallback(() => {
    if (filteredItems.length === 0) return;
    setPlayAllActive(true);
    setPlayAllPaused(false);
    playItemAtIndex(0, filteredItems);
  }, [filteredItems, playItemAtIndex]);

  const pausePlayAll = useCallback(() => {
    if (!audioRef.current) return;
    clearActiveTimer();
    audioRef.current.pause();
    setPlayAllPaused(true);
  }, [clearActiveTimer]);

  const resumePlayAll = useCallback(() => {
    setPlayAllPaused(false);
    playItemAtIndex(playAllIndexRef.current, filteredItems);
  }, [filteredItems, playItemAtIndex]);

  const nextInPlayAll = useCallback(() => {
    playItemAtIndex(playAllIndexRef.current + 1, filteredItems);
  }, [filteredItems, playItemAtIndex]);

  return {
    nextInPlayAll,
    pausePlayAll,
    playAllActive,
    playAllIndex,
    playAllPaused,
    playAudio,
    playingId,
    resumePlayAll,
    startPlayAll,
    stopPlayAll,
  };
}
