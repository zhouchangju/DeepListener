import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

export interface AudioRecorderMessages {
  /** Toast shown when the user denied microphone permission. */
  micDenied?: string;
}

export function useAudioRecorder(messages?: AudioRecorderMessages) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback((duration: number): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
             mediaRecorderRef.current.stop();
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop()); // Stop stream
          resolve(blob);
        };

        recorder.start();
        setIsRecording(true);

        timeoutRef.current = setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, Math.max(2000, duration));

      } catch (err) {
        console.error(err);
        toast.error(messages?.micDenied ?? "Microphone access denied.");
        setIsRecording(false);
        reject(err);
      }
    });
  }, [messages]);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Keep a ref to the latest stopRecording so the unmount cleanup always calls
  // the current implementation without re-subscribing on every render.
  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // Self-protection: if a consumer unmounts while recording is active (e.g.
  // navigates away mid-shadowing), tear down the MediaRecorder, the pending
  // timeout, and — via recorder.onstop — the microphone stream. Without this,
  // the browser mic indicator stays lit for at least `max(2000, duration)` ms
  // after the component is gone, because onstop only fires when the timeout
  // eventually calls recorder.stop().
  useEffect(() => {
    return () => {
      stopRecordingRef.current();
    };
  }, []);

  return { startRecording, stopRecording, isRecording };
}
