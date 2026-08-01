"use client";

import { useCallback, useEffect, useRef } from "react";

interface ReviewAudioItem {
  sentence: {
    startTime: number;
    endTime: number;
    track: {
      audioUrl: string;
    };
  };
}

interface UseReviewAudioOptions {
  current: ReviewAudioItem | null | undefined;
  playbackRate: number;
  /**
   * Called when the browser blocked audio playback (e.g. the user has not
   * interacted with the page yet). Previously this was a silent
   * `console.log`, leaving the user with no audio and no explanation during a
   * review session. The caller is expected to surface a toast with a retry.
   */
  onPlaybackBlocked?: (reason: unknown) => void;
}

export function useReviewAudio({ current, playbackRate, onPlaybackBlocked }: UseReviewAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentItemRef = useRef<ReviewAudioItem | null>(null);
  const onPlaybackBlockedRef = useRef(onPlaybackBlocked);

  useEffect(() => {
    onPlaybackBlockedRef.current = onPlaybackBlocked;
  }, [onPlaybackBlocked]);

  useEffect(() => {
    currentItemRef.current = current ?? null;
  }, [current]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const playAudio = useCallback(() => {
    const currentItem = currentItemRef.current;
    if (!currentItem) return;

    audioRef.current?.pause();

    const audio = new Audio(currentItem.sentence.track.audioUrl);
    audioRef.current = audio;
    audio.src = currentItem.sentence.track.audioUrl;
    audio.currentTime = currentItem.sentence.startTime;
    audio.playbackRate = playbackRate;

    const stopTime = currentItem.sentence.endTime;
    const onTimeUpdate = () => {
      if (audio.currentTime >= stopTime) {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.play().catch((error) => {
      // Auto-play policies block audio that starts without a user gesture.
      // This is a real, user-visible condition (no audio during review) so we
      // surface it instead of failing silently.
      console.warn("Review audio playback blocked:", error);
      onPlaybackBlockedRef.current?.(error);
    });
  }, [playbackRate]);

  return { playAudio };
}
