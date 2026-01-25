import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback((duration: number): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          setIsRecording(false);
          resolve(blob);
        };

        recorder.start();
        setIsRecording(true);

        setTimeout(() => {
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

  return { startRecording, isRecording };
}
