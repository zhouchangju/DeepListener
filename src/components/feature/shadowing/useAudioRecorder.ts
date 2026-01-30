import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export function useAudioRecorder() {
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
        toast.error("Microphone access denied.");
        setIsRecording(false);
        reject(err);
      }
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { startRecording, stopRecording, isRecording };
}
