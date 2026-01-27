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
      // Sync initial rate
      originalAudioRef.current.playbackRate = playbackRate;
    } catch (e) {
      console.error("Slice failed", e);
      toast.error("Audio slice failed");
    }
  }, [fullAudioBuffer, sentence]);

  // Real-time rate sync
  useEffect(() => {
    if (originalAudioRef.current) {
      originalAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const playOriginal = useCallback((onEnded?: () => void) => {
    const audio = originalAudioRef.current;
    if (!audio) return;
    
    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.play();
    audio.onended = () => onEnded?.();
  }, [playbackRate]);

  const handleStartFlow = useCallback(() => {
    setMode("playing_original");
    setUserBlob(null);
    
    playOriginal(() => {
      setMode("recording");
      // Adjust duration based on playback speed (slower speed = longer duration)
      // Base duration is 1.5x the original length.
      // If speed is 0.5x, the audio takes 2x longer to play, so we should probably allow more time for recording too?
      // Actually, user speaking speed is independent of playback speed, but they might be mimicking slow speech.
      // Let's keep the recording window generous: (duration / rate) * 1.5 might be too long if rate is 0.5.
      // Let's stick to (duration * 1.5) / rate to be safe.
      const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;
      
      startRecording(duration).then((blob) => {
        setUserBlob(blob);
        setMode("reviewing");
        
        // Auto-play user recording
        const userUrl = URL.createObjectURL(blob);
        new Audio(userUrl).play();
      });
    });
  }, [sentence, playOriginal, startRecording, playbackRate]);

  const handleRecAgain = useCallback(() => {
    setMode("recording");
    const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;
    
    startRecording(duration).then((blob) => {
      setUserBlob(blob);
      setMode("reviewing");
      const userUrl = URL.createObjectURL(blob);
      new Audio(userUrl).play();
    });
  }, [sentence, startRecording, playbackRate]);

  return {
    mode,
    originalBlob,
    userBlob,
    startFlow: handleStartFlow,
    handleRecAgain,
  };
}
