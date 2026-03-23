import { useRef, useState, useCallback, useEffect } from "react";

export interface BatchPlaybackState {
  isActive: boolean;
  isPaused: boolean;
  currentIndex: number;
  currentTrackId: string | null;
}

export interface TrackForPlayback {
  id: string;
  title: string;
  audioUrl: string;
}

const GAP_SECONDS = 3;

export function useBatchPlayback(tracks: TrackForPlayback[]) {
  const [state, setState] = useState<BatchPlaybackState>({
    isActive: false,
    isPaused: false,
    currentIndex: 0,
    currentTrackId: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIndexRef = useRef(0);
  const gapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (gapTimeoutRef.current) {
        clearTimeout(gapTimeoutRef.current);
      }
    };
  }, []);

  const startBatchPlayback = useCallback((startIndex: number = 0) => {
    if (tracks.length === 0) return;

    // Clean up any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (gapTimeoutRef.current) {
      clearTimeout(gapTimeoutRef.current);
    }

    currentIndexRef.current = startIndex;
    const track = tracks[startIndex];

    const audio = new Audio(track.audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      const nextIndex = (currentIndexRef.current + 1) % tracks.length;
      currentIndexRef.current = nextIndex;

      // 3-second gap before next track
      gapTimeoutRef.current = setTimeout(() => {
        const nextTrack = tracks[nextIndex];
        if (nextTrack) {
          const nextAudio = new Audio(nextTrack.audioUrl);
          audioRef.current = nextAudio;
          nextAudio.onended = audio.onended;
          nextAudio.play().catch(console.error);
          setState((prev) => ({
            ...prev,
            currentIndex: nextIndex,
            currentTrackId: nextTrack.id,
          }));
        }
      }, GAP_SECONDS * 1000);

      setState((prev) => ({
        ...prev,
        currentIndex: nextIndex,
        currentTrackId: null, // Show "gap" state
      }));
    };

    audio.play().catch(console.error);

    setState({
      isActive: true,
      isPaused: false,
      currentIndex: startIndex,
      currentTrackId: track.id,
    });
  }, [tracks]);

  const pauseBatchPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resumeBatchPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const stopBatchPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (gapTimeoutRef.current) {
      clearTimeout(gapTimeoutRef.current);
      gapTimeoutRef.current = null;
    }

    setState({
      isActive: false,
      isPaused: false,
      currentIndex: 0,
      currentTrackId: null,
    });
  }, []);

  const skipToNext = useCallback(() => {
    const nextIndex = (currentIndexRef.current + 1) % tracks.length;
    currentIndexRef.current = nextIndex;
    startBatchPlayback(nextIndex);
  }, [tracks.length, startBatchPlayback]);

  const skipToPrev = useCallback(() => {
    const prevIndex =
      currentIndexRef.current === 0
        ? tracks.length - 1
        : currentIndexRef.current - 1;
    currentIndexRef.current = prevIndex;
    startBatchPlayback(prevIndex);
  }, [tracks.length, startBatchPlayback]);

  const getCurrentTrack = useCallback(() => {
    if (state.currentIndex >= 0 && state.currentIndex < tracks.length) {
      return tracks[state.currentIndex];
    }
    return null;
  }, [tracks, state.currentIndex]);

  return {
    state,
    controls: {
      start: startBatchPlayback,
      pause: pauseBatchPlayback,
      resume: resumeBatchPlayback,
      stop: stopBatchPlayback,
      skipNext: skipToNext,
      skipPrev: skipToPrev,
    },
    getCurrentTrack,
  };
}
