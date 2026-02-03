import { useState, useRef, useEffect, useCallback } from "react";
import { sliceAudioBuffer } from "@/lib/audio-utils";
import { toast } from "sonner";
import { useAudioRecorder } from "./useAudioRecorder";

type Mode = "idle" | "playing_original" | "recording" | "reviewing";

interface UseShadowingWorkflowProps {
  sentence: { id?: string; text: string; startTime: number; endTime: number };
  fullAudioBuffer: AudioBuffer;
  playbackRate: number;
}

export function useShadowingWorkflow({ sentence, fullAudioBuffer, playbackRate }: UseShadowingWorkflowProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [userBlob, setUserBlob] = useState<Blob | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortedRef = useRef(false);
  const activeSentenceIdRef = useRef<string | undefined>(undefined);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();

  // Stop everything cleanup
  const stopAll = useCallback(() => {
    abortedRef.current = true;
    stopRecording();
    
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
    }

    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      originalAudioRef.current.currentTime = 0;
      originalAudioRef.current.onended = null; // Clear handlers
    }

    setMode("idle");
    setIsLooping(false);
  }, [stopRecording]);

  // Initialize slice (only when sentence or fullAudioBuffer changes)
  useEffect(() => {
    stopAll(); // Stop previous when sentence changes
    abortedRef.current = false; // Reset for new sentence
    activeSentenceIdRef.current = sentence.id; // Track active sentence
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
  }, [fullAudioBuffer, sentence]); // Remove playbackRate and stopAll from dependencies

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
    
    // Clear any existing loop timeout when dependency changes
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);

    if (isLooping) {
        audio.loop = false; // We handle loop manually
        setMode("playing_original");
        
        const playStep = () => {
             audio.currentTime = 0;
             audio.play().catch(() => {});
        };

        audio.onended = () => {
            if (!isLooping) return; // Should be handled by unmount/dep change but safety check
            loopTimeoutRef.current = setTimeout(() => {
                 playStep();
            }, 1000); // 1s Delay
        };

        playStep();
    } else {
        // If we just turned off looping, pause if playing
        // But be careful not to interfere if we transitioned to another mode (like recording)
        // Actually stopAll() handles mode reset, but if we toggle button...
        if (mode === "playing_original") {
             audio.pause();
             setMode("idle");
        }
        // Remove handler if it was the loop handler
        // Note: playOriginal/startFlow override onended, so this is fine.
    }
    
    return () => {
        if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [isLooping]); // Depend on isLooping. When it changes, effect re-runs.

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
    abortedRef.current = false;
    setMode("playing_original");
    setUserBlob(null);
    
    const audio = originalAudioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.play();
    
    // Override onended for the flow
    audio.onended = () => {
      if (abortedRef.current || activeSentenceIdRef.current !== sentence.id) return;
      setMode("recording");
      const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;
      
      startRecording(duration).then((blob) => {
        if (abortedRef.current || activeSentenceIdRef.current !== sentence.id) return;
        setUserBlob(blob);
        setMode("reviewing");
      });
    };
  }, [sentence, startRecording, stopAll, playbackRate]);

  const handleRecAgain = useCallback(() => {
    stopAll(); // Reset
    abortedRef.current = false;
    setMode("recording");
    const duration = ((sentence.endTime - sentence.startTime) / playbackRate) * 1000 * 1.5;
    
    startRecording(duration).then((blob) => {
      if (abortedRef.current || activeSentenceIdRef.current !== sentence.id) return;
      setUserBlob(blob);
      setMode("reviewing");
    });
  }, [sentence, startRecording, stopAll, playbackRate]);

  return {
    mode,
    originalBlob,
    userBlob,
    isLooping,
    startFlow: handleStartFlow,
    playOriginal,
    handleRecAgain,
    stopAll,
    toggleLoop,
  };
}
