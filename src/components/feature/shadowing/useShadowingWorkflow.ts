import { useState, useRef, useEffect, useCallback } from "react";
import { sliceAudioBuffer } from "@/lib/audio-utils";
import { toast } from "sonner";
import { useAudioRecorder } from "./useAudioRecorder";

type Mode = "idle" | "playing_original" | "recording" | "reviewing";

interface UseShadowingWorkflowProps {
  sentence: { text: string; startTime: number; endTime: number };
  fullAudioBuffer: AudioBuffer;
}

export function useShadowingWorkflow({ sentence, fullAudioBuffer }: UseShadowingWorkflowProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [userBlob, setUserBlob] = useState<Blob | null>(null);
  
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const { startRecording, isRecording } = useAudioRecorder();

  // Initialize slice
  useEffect(() => {
    setMode("idle");
    setOriginalBlob(null);
    setUserBlob(null);

    try {
      const blob = sliceAudioBuffer(fullAudioBuffer, sentence.startTime, sentence.endTime);
      setOriginalBlob(blob);
      const url = URL.createObjectURL(blob);
      originalAudioRef.current = new Audio(url);
    } catch (e) {
      console.error("Slice failed", e);
      toast.error("Audio slice failed");
    }
  }, [fullAudioBuffer, sentence]);

  const playOriginal = useCallback((onEnded?: () => void) => {
    const audio = originalAudioRef.current;
    if (!audio) return;
    
    audio.currentTime = 0;
    audio.play();
    audio.onended = () => onEnded?.();
  }, []);

  const handleStartFlow = useCallback(() => {
    setMode("playing_original");
    setUserBlob(null);
    
    playOriginal(() => {
      setMode("recording");
      const duration = (sentence.endTime - sentence.startTime) * 1000 * 1.5;
      
      startRecording(duration).then((blob) => {
        setUserBlob(blob);
        setMode("reviewing");
        
        // Auto-play user recording
        const userUrl = URL.createObjectURL(blob);
        new Audio(userUrl).play();
      });
    });
  }, [sentence, playOriginal, startRecording]);

  const handleRecAgain = useCallback(() => {
    setMode("recording");
    const duration = (sentence.endTime - sentence.startTime) * 1000 * 1.5;
    
    startRecording(duration).then((blob) => {
      setUserBlob(blob);
      setMode("reviewing");
      const userUrl = URL.createObjectURL(blob);
      new Audio(userUrl).play();
    });
  }, [sentence, startRecording]);

  return {
    mode,
    originalBlob,
    userBlob,
    startFlow: handleStartFlow,
    handleRecAgain,
  };
}
