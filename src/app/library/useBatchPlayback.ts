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
  // Tracks ref so the stable onEnded handler always reads the latest list
  // without being recreated (which previously caused chained closures that
  // leaked every prior Audio element).
  const tracksRef = useRef(tracks);
  // playTrack ref breaks the cycle between playTrack and its onended handler
  // so both stay stable (single identity) and every Audio element binds the
  // SAME handler instead of chaining fresh closures that leak.
  const playTrackRef = useRef<(index: number) => void>(() => {});

  // Detach handlers + pause + null the ref so the previous Audio element can
  // be GC'd and its listeners stop firing.
  const detachAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.pause();
      audioRef.current = null;
    }
  }, []);

  // Keep the latest values in refs without writing refs during render.
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      detachAudio();
      if (gapTimeoutRef.current) {
        clearTimeout(gapTimeoutRef.current);
        gapTimeoutRef.current = null;
      }
    };
  }, [detachAudio]);

  const playTrack = useCallback((index: number) => {
    const currentTracks = tracksRef.current;
    const track = currentTracks[index];
    if (!track) return;

    detachAudio();
    if (gapTimeoutRef.current) {
      clearTimeout(gapTimeoutRef.current);
      gapTimeoutRef.current = null;
    }

    currentIndexRef.current = index;
    const audio = new Audio(track.audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      const innerTracks = tracksRef.current;
      const nextIndex = (currentIndexRef.current + 1) % innerTracks.length;

      // Enter the gap: detach the finished element so it can be GC'd, then
      // schedule the next track.
      detachAudio();

      setState((prev) => ({
        ...prev,
        currentIndex: nextIndex,
        currentTrackId: null, // Show "gap" state
      }));

      gapTimeoutRef.current = setTimeout(() => {
        playTrackRef.current(nextIndex);
      }, GAP_SECONDS * 1000);
    };
    audio.play().catch(console.error);

    setState((prev) => ({
      ...prev,
      currentIndex: index,
      currentTrackId: track.id,
    }));
  }, [detachAudio]);

  // Keep the ref in sync so the scheduled timeout calls the latest playTrack.
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const startBatchPlayback = useCallback((startIndex: number = 0) => {
    if (tracksRef.current.length === 0) return;
    playTrack(startIndex);
    // playTrack already set currentIndex/currentTrackId; we additionally
    // flip isActive on and clear isPaused.
    setState((prev) => ({ ...prev, isActive: true, isPaused: false }));
  }, [playTrack]);

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
    detachAudio();
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
  }, [detachAudio]);

  const skipToNext = useCallback(() => {
    const nextIndex = (currentIndexRef.current + 1) % tracksRef.current.length;
    playTrack(nextIndex);
    setState((prev) => ({ ...prev, isActive: true, isPaused: false }));
  }, [playTrack]);

  const skipToPrev = useCallback(() => {
    const len = tracksRef.current.length;
    const prevIndex = currentIndexRef.current === 0 ? len - 1 : currentIndexRef.current - 1;
    playTrack(prevIndex);
    setState((prev) => ({ ...prev, isActive: true, isPaused: false }));
  }, [playTrack]);

  const getCurrentTrack = useCallback(() => {
    // During the inter-track gap currentTrackId is null; reflect that here
    // instead of returning the next track's metadata prematurely.
    if (state.currentTrackId === null) return null;
    if (state.currentIndex >= 0 && state.currentIndex < tracks.length) {
      return tracks[state.currentIndex];
    }
    return null;
  }, [tracks, state.currentIndex, state.currentTrackId]);

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
