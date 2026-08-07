"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VaultPlaybackItem } from "./vault-items";

/**
 * Drives sentence playback off the audio element's own timeupdate event
 * instead of wall-clock setTimeout. Wall-clock timers fired late when the
 * tab was backgrounded (browser throttles timers) and fired early when the
 * audio stalled/buffered, causing the next sentence to start mid-playback or
 * the previous one to linger. Comparing audio.currentTime against the
 * sentence end time keeps the UI in sync with what the user actually hears.
 */
export interface VaultPlaybackMessages {
  /** Toast shown when play-all completes. `{ count }` is interpolated. */
  playAllFinished: (count: number) => string;
  /** Toast shown when the browser blocked autoplay for a vault item. */
  playbackBlocked: string;
}

/**
 * Drives sentence playback off the audio element's own timeupdate event
 * instead of wall-clock setTimeout. Wall-clock timers fired late when the
 * tab was backgrounded (browser throttles timers) and fired early when the
 * audio stalled/buffered, causing the next sentence to start mid-playback or
 * the previous one to linger. Comparing audio.currentTime against the
 * sentence end time keeps the UI in sync with what the user actually hears.
 *
 * `messages` lets the caller supply localized toast strings; the hook itself
 * cannot call useTranslations cleanly because it returns callback functions
 * that close over stale state.
 */
export function useVaultPlayback(
  filteredItems: VaultPlaybackItem[],
  messages?: VaultPlaybackMessages,
) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playAllActive, setPlayAllActive] = useState(false);
  const [playAllIndex, setPlayAllIndex] = useState(0);
  const [playAllPaused, setPlayAllPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAllIndexRef = useRef(0);
  // End time (seconds) for the sentence currently loaded into the audio
  // element. The timeupdate handler uses this to detect when to advance.
  const endTimeRef = useRef<number | null>(null);
  // What to do when the current sentence finishes: either stop (single play)
  // or advance to the next item (play-all). Stored as a stable callback ref.
  const onEndRef = useRef<(() => void) | null>(null);
  const filteredItemsRef = useRef(filteredItems);
  // playItemAtIndex ref breaks the cycle: loadSentence's onEnd callback calls
  // playItemAtIndex, which itself calls loadSentence. Keeping the latest
  // playItemAtIndex in a ref lets both stay stable.
  const playItemAtIndexRef = useRef<(index: number, items: VaultPlaybackItem[]) => void>(() => {});

  useEffect(() => {
    filteredItemsRef.current = filteredItems;
  }, [filteredItems]);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.addEventListener("timeupdate", () => {
        const end = endTimeRef.current;
        if (end !== null && audio.currentTime >= end) {
          audio.pause();
          endTimeRef.current = null;
          const cb = onEndRef.current;
          if (cb) cb();
        }
      });
      audio.addEventListener("ended", () => {
        // Fallback: if timeupdate never fires at/after end (e.g. the browser
        // stops firing it once paused), ended still advances.
        endTimeRef.current = null;
        const cb = onEndRef.current;
        if (cb) cb();
      });
      audio.addEventListener("error", () => {
        setPlayingId(null);
        setPlayAllActive(false);
      });
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  // Stop everything and reset state.
  const stopPlayAll = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    endTimeRef.current = null;
    onEndRef.current = null;
    setPlayAllActive(false);
    setPlayAllPaused(false);
    setPlayAllIndex(0);
    playAllIndexRef.current = 0;
    setPlayingId(null);
  }, []);

  // Load + play a single sentence and arm its end behavior. The caller
  // supplies onError so this callback stays independent of state closures.
  const loadSentence = useCallback(
    (
      item: VaultPlaybackItem,
      onEnd: (() => void) | null,
      onError: (() => void) | null
    ) => {
      const audio = ensureAudio();
      audio.src = item.sentence.track.audioUrl;
      audio.currentTime = item.sentence.startTime;
      endTimeRef.current = item.sentence.endTime;
      onEndRef.current = onEnd;
      setPlayingId(item.id);
      audio.play().catch((error) => {
        // AbortError means this play() was interrupted — by pause() from the
        // stop/pause controls, or by a newer loadSentence that already armed
        // its own endTime/onEnd state. Neither is a failure: clearing refs
        // here would clobber the newer sentence's armed state, and surfacing
        // it would misreport a normal interruption as an autoplay block.
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Autoplay block / decode error: clear playback state and let the
        // caller decide how to surface it.
        endTimeRef.current = null;
        onEndRef.current = null;
        setPlayingId((prev) => (prev === item.id ? null : prev));
        if (onError) onError();
      });
    },
    [ensureAudio]
  );

  const playAudio = useCallback(
    (item: VaultPlaybackItem) => {
      if (playAllActive) {
        stopPlayAll();
      }

      // Toggle off if the same item is playing.
      if (playingId === item.id) {
        const audio = ensureAudio();
        audio.pause();
        endTimeRef.current = null;
        onEndRef.current = null;
        setPlayingId(null);
        return;
      }

      loadSentence(
        item,
        () => {
          setPlayingId(null);
        },
        null
      );
    },
    [ensureAudio, loadSentence, playAllActive, playingId, stopPlayAll]
  );

  const playItemAtIndex = useCallback(
    (index: number, items: VaultPlaybackItem[]) => {
      if (index >= items.length) {
        stopPlayAll();
        const msg = messages?.playAllFinished(items.length) ?? `Finished playing ${items.length} sentences`;
        toast.success(msg);
        return;
      }

      const item = items[index];
      setPlayAllIndex(index);
      playAllIndexRef.current = index;

      loadSentence(
        item,
        () => {
          playItemAtIndexRef.current(playAllIndexRef.current + 1, filteredItemsRef.current);
        },
        () => {
          stopPlayAll();
          toast.error(messages?.playbackBlocked ?? "Playback was blocked");
        }
      );
    },
    [loadSentence, stopPlayAll, messages]
  );

  // Keep the ref in sync so the scheduled onEnd calls the latest implementation.
  useEffect(() => {
    playItemAtIndexRef.current = playItemAtIndex;
  }, [playItemAtIndex]);

  const startPlayAll = useCallback(() => {
    if (filteredItems.length === 0) return;
    setPlayAllActive(true);
    setPlayAllPaused(false);
    playItemAtIndex(0, filteredItems);
  }, [filteredItems, playItemAtIndex]);

  const pausePlayAll = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlayAllPaused(true);
  }, []);

  const resumePlayAll = useCallback(() => {
    setPlayAllPaused(false);
    playItemAtIndex(playAllIndexRef.current, filteredItems);
  }, [filteredItems, playItemAtIndex]);

  const nextInPlayAll = useCallback(() => {
    playItemAtIndex(playAllIndexRef.current + 1, filteredItems);
  }, [filteredItems, playItemAtIndex]);

  // Note: we intentionally do NOT use a setState-in-effect to invalidate
  // playback when the list changes. That pattern triggers cascading renders.
  // Instead, playItemAtIndex validates the index/items at call time, and the
  // component layer can call stopPlayAll() when filters change if needed.

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
