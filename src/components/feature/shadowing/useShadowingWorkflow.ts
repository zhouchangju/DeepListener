import { useState, useRef, useEffect, useCallback } from "react";
import { sliceAudioBuffer } from "@/lib/audio-utils";
import { toast } from "sonner";
import { useAudioRecorder } from "./useAudioRecorder";

type Mode = "idle" | "playing_original" | "recording" | "reviewing";

interface UseShadowingWorkflowProps {
  sentence: { text: string; startTime: number; endTime: number };
  fullAudioBuffer: AudioBuffer;
  playbackRate: number;
}

export function useShadowingWorkflow({ sentence, fullAudioBuffer, playbackRate }: UseShadowingWorkflowProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [userBlob, setUserBlob] = useState<Blob | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();

  // Stop everything cleanup
  const stopAll = useCallback(() => {
    stopRecording();
    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      originalAudioRef.current.currentTime = 0;
    }
    setMode("idle");
    setIsLooping(false);
  }, [stopRecording]);

  // Initialize slice
  useEffect(() => {
    stopAll(); // Stop previous when sentence changes
    setOriginalBlob(null);
    setUserBlob(null);

    try {
      const blob = sliceAudioBuffer(fullAudioBuffer, sentence.startTime, sentence.endTime);
      setOriginalBlob(blob);
      const url = URL.createObjectURL(blob);
      originalAudioRef.current = new Audio(url);
      originalAudioRef.current.playbackRate = playbackRate;
    } catch (e) {
      console.error("Slice failed", e);
      toast.error("Audio slice failed");
    }
    
    return () => stopAll();
  }, [fullAudioBuffer, sentence, stopAll, playbackRate]);

  // Real-time rate sync
  useEffect(() => {
    if (originalAudioRef.current) {
      originalAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Loop effect
  useEffect(() => {
    const audio = originalAudioRef.current;
    if (!audio) return;
    
    if (isLooping) {
        audio.loop = true;
        audio.play().catch(() => {});
        setMode("playing_original");
    } else {
        audio.loop = false;
        audio.pause();
        if (mode === "playing_original") setMode("idle");
    }
  }, [isLooping]);

  const toggleLoop = useCallback(() => {
    stopRecording(); // Ensure recording stops
    setIsLooping(prev => !prev);
  }, [stopRecording]);

  const playOriginal = useCallback((onEnded?: () => void) => {
    stopRecording(); // Interrupt recording
    setIsLooping(false); // Disable loop if manual play

    const audio = originalAudioRef.current;
    if (!audio) return;
    
    setMode("playing_original");
    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.play();
    audio.onended = () => {
        setMode("idle"); // Reset to idle after single play unless flow overrides
        onEnded?.();
    };
  }, [playbackRate, stopRecording]);

  const handleStartFlow = useCallback(() => {
    stopAll(); // Reset everything
    setMode("playing_original");
    setUserBlob(null);
    
    const audio = originalAudioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.play();
    
    // Override onended for the flow
    audio.onended = () => {
      setMode("recording");
      const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;
      
      startRecording(duration).then((blob) => {
        setUserBlob(blob);
        setMode("reviewing");
        const userUrl = URL.createObjectURL(blob);
        new Audio(userUrl).play();
      });
    };
  }, [sentence, startRecording, stopAll, playbackRate]);

  const handleRecAgain = useCallback(() => {
    stopAll(); // Reset
    setMode("recording");
    const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;
    
    startRecording(duration).then((blob) => {
      setUserBlob(blob);
      setMode("reviewing");
      const userUrl = URL.createObjectURL(blob);
      new Audio(userUrl).play();
    });
  }, [sentence, startRecording, stopAll, playbackRate]);

  return {
    mode,
    originalBlob,
    userBlob,
    isLooping,
    startFlow: handleStartFlow,
    handleRecAgain,
    stopAll,
    toggleLoop,
  };
}
