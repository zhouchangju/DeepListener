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
}

export function useReviewAudio({ current, playbackRate }: UseReviewAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentItemRef = useRef<ReviewAudioItem | null>(null);

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
    audio.play().catch((error) => console.log("Auto-play prevented:", error));
  }, [playbackRate]);

  return { playAudio };
}
