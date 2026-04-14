import { useState, useRef, useEffect, useCallback } from "react";
import { sliceAudioBuffer } from "@/lib/audio-utils";
import { toast } from "sonner";
import { useAudioRecorder } from "./useAudioRecorder";
import {
  getDisplayedShadowingOriginalAudio,
  getShadowingAudioSliceKey,
} from "./presentation";

type Mode = "idle" | "playing_original" | "recording" | "reviewing";

interface UseShadowingWorkflowProps {
  sentence: { id?: string; text: string; startTime: number; endTime: number };
  fullAudioBuffer: AudioBuffer;
  playbackRate: number;
}

export function useShadowingWorkflow({ sentence, fullAudioBuffer, playbackRate }: UseShadowingWorkflowProps) {
  const [modeState, setModeState] = useState<{ sliceKey: string; value: Mode }>({
    sliceKey: "",
    value: "idle",
  });
  const [originalBlobState, setOriginalBlobState] = useState<{ sliceKey: string; blob: Blob | null }>({
    sliceKey: "",
    blob: null,
  });
  const [userBlobState, setUserBlobState] = useState<{ sliceKey: string; blob: Blob | null }>({
    sliceKey: "",
    blob: null,
  });
  const [loopState, setLoopState] = useState<{ sliceKey: string; value: boolean }>({
    sliceKey: "",
    value: false,
  });

  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalAudioUrlRef = useRef<string | null>(null);
  const abortedRef = useRef(false);
  const isLoopingRef = useRef(false);
  const activeSentenceIdRef = useRef<string | undefined>(undefined);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { startRecording, stopRecording } = useAudioRecorder();
  const sliceKey = getShadowingAudioSliceKey(sentence);
  const displayedOriginalAudio = getDisplayedShadowingOriginalAudio(
    originalBlobState,
    sliceKey
  );

  const mode = modeState.sliceKey === sliceKey ? modeState.value : "idle";
  const originalBlob = displayedOriginalAudio.blob;
  const isOriginalBlobReady = displayedOriginalAudio.isReady;
  const userBlob = userBlobState.sliceKey === sliceKey ? userBlobState.blob : null;
  const isLooping = loopState.sliceKey === sliceKey ? loopState.value : false;

  const setModeForCurrentSlice = useCallback((value: Mode) => {
    setModeState({ sliceKey, value });
  }, [sliceKey]);

  const setOriginalBlobForCurrentSlice = useCallback((blob: Blob | null) => {
    setOriginalBlobState({ sliceKey, blob });
  }, [sliceKey]);

  const setUserBlobForCurrentSlice = useCallback((blob: Blob | null) => {
    setUserBlobState({ sliceKey, blob });
  }, [sliceKey]);

  const setLoopingForCurrentSlice = useCallback((value: boolean) => {
    isLoopingRef.current = value;
    setLoopState({ sliceKey, value });
  }, [sliceKey]);

  const resetMedia = useCallback(() => {
    stopRecording();

    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      originalAudioRef.current.currentTime = 0;
      originalAudioRef.current.onended = null;
    }
  }, [stopRecording]);

  const destroyOriginalAudio = useCallback(() => {
    if (originalAudioUrlRef.current) {
      URL.revokeObjectURL(originalAudioUrlRef.current);
      originalAudioUrlRef.current = null;
    }

    originalAudioRef.current = null;
  }, []);

  const stopAll = useCallback(() => {
    abortedRef.current = true;
    resetMedia();
    setModeForCurrentSlice("idle");
    setLoopingForCurrentSlice(false);
  }, [resetMedia, setLoopingForCurrentSlice, setModeForCurrentSlice]);

  useEffect(() => {
    abortedRef.current = true;
    resetMedia();
    destroyOriginalAudio();
    activeSentenceIdRef.current = sentence.id;

    const timer = window.setTimeout(() => {
      abortedRef.current = false;
      setModeForCurrentSlice("idle");
      setLoopingForCurrentSlice(false);
      setUserBlobForCurrentSlice(null);

      try {
        const blob = sliceAudioBuffer(fullAudioBuffer, sentence.startTime, sentence.endTime);
        setOriginalBlobForCurrentSlice(blob);
        const url = URL.createObjectURL(blob);
        originalAudioUrlRef.current = url;
        originalAudioRef.current = new Audio(url);
        originalAudioRef.current.playbackRate = playbackRate;
      } catch (error) {
        setOriginalBlobForCurrentSlice(null);
        console.error("Slice failed", error);
        toast.error("Audio slice failed");
      }
    }, 0);

    return () => {
      abortedRef.current = true;
      window.clearTimeout(timer);
      resetMedia();
      destroyOriginalAudio();
    };
  }, [
    destroyOriginalAudio,
    fullAudioBuffer,
    playbackRate,
    resetMedia,
    sentence.endTime,
    sentence.id,
    sentence.startTime,
    setLoopingForCurrentSlice,
    setModeForCurrentSlice,
    setOriginalBlobForCurrentSlice,
    setUserBlobForCurrentSlice,
  ]);

  // Real-time rate sync
  useEffect(() => {
    if (originalAudioRef.current) {
      originalAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Loop effect with Delay
  useEffect(() => {
    const audio = originalAudioRef.current;
    if (!audio) return;

    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    if (isLooping) {
      audio.loop = false;

      const playStep = () => {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      };

      audio.onended = () => {
        if (!isLoopingRef.current) return;
        loopTimeoutRef.current = setTimeout(() => {
          playStep();
        }, 1000);
      };

      playStep();
    } else {
      audio.pause();
      audio.onended = null;
    }

    return () => {
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
    };
  }, [isLooping]);

  const toggleLoop = useCallback(() => {
    const nextIsLooping = !isLooping;
    resetMedia();
    abortedRef.current = false;
    setLoopingForCurrentSlice(nextIsLooping);
    setModeForCurrentSlice(nextIsLooping ? "playing_original" : "idle");
  }, [isLooping, resetMedia, setLoopingForCurrentSlice, setModeForCurrentSlice]);

  const playOriginal = useCallback((onEnded?: () => void) => {
    resetMedia();
    abortedRef.current = false;
    setLoopingForCurrentSlice(false);

    const audio = originalAudioRef.current;
    if (!audio) return;

    setModeForCurrentSlice("playing_original");
    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    audio.onended = () => {
      setModeForCurrentSlice("idle");
      onEnded?.();
    };
  }, [playbackRate, resetMedia, setLoopingForCurrentSlice, setModeForCurrentSlice]);

  const handleStartFlow = useCallback(() => {
    resetMedia();
    abortedRef.current = false;
    setLoopingForCurrentSlice(false);
    setModeForCurrentSlice("playing_original");
    setUserBlobForCurrentSlice(null);

    const audio = originalAudioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.play().catch(() => {});

    audio.onended = () => {
      if (abortedRef.current || activeSentenceIdRef.current !== sentence.id) return;
      setModeForCurrentSlice("recording");
      const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;

      startRecording(duration).then((blob) => {
        if (abortedRef.current || activeSentenceIdRef.current !== sentence.id) return;
        setUserBlobForCurrentSlice(blob);
        setModeForCurrentSlice("reviewing");
      });
    };
  }, [
    playbackRate,
    resetMedia,
    sentence.endTime,
    sentence.id,
    sentence.startTime,
    setLoopingForCurrentSlice,
    setModeForCurrentSlice,
    setUserBlobForCurrentSlice,
    startRecording,
  ]);

  const handleRecAgain = useCallback(() => {
    resetMedia();
    abortedRef.current = false;
    setLoopingForCurrentSlice(false);
    setModeForCurrentSlice("recording");
    setUserBlobForCurrentSlice(null);
    const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;

    startRecording(duration).then((blob) => {
      if (abortedRef.current || activeSentenceIdRef.current !== sentence.id) return;
      setUserBlobForCurrentSlice(blob);
      setModeForCurrentSlice("reviewing");
    });
  }, [
    playbackRate,
    resetMedia,
    sentence.endTime,
    sentence.id,
    sentence.startTime,
    setLoopingForCurrentSlice,
    setModeForCurrentSlice,
    setUserBlobForCurrentSlice,
    startRecording,
  ]);

  return {
    mode,
    originalBlob,
    isOriginalBlobReady,
    userBlob,
    isLooping,
    startFlow: handleStartFlow,
    playOriginal,
    handleRecAgain,
    stopAll,
    toggleLoop,
  };
}
