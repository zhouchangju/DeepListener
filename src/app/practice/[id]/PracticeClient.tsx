"use client";

import { useState } from "react";
import AudioPlayer from "@/components/feature/AudioPlayer";
import DiagnosisModal from "@/components/feature/DiagnosisModal";
import { toast } from "sonner";

interface PracticeClientProps {
  track: any;
}

export default function PracticeClient({ track }: PracticeClientProps) {
  const [capturingSentenceId, setCapturingSentenceId] = useState<string | null>(null);

  const handleCapture = (sentenceId: string) => {
    setCapturingSentenceId(sentenceId);
  };

  const currentSentence = track.sentences.find((s: any) => s.id === capturingSentenceId);

  const saveToVault = async (tags: string[], note: string) => {
    if (!capturingSentenceId) return;

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: capturingSentenceId,
          tags,
          note,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Added to your Vault!");
      setCapturingSentenceId(null);
    } catch (error) {
      toast.error("Failed to save to vault");
    }
  };

  return (
    <>
      <AudioPlayer 
        audioUrl={track.audioUrl} 
        sentences={track.sentences} 
        onCapture={handleCapture} 
      />
      
      <DiagnosisModal
        isOpen={!!capturingSentenceId}
        onClose={() => setCapturingSentenceId(null)}
        sentenceText={currentSentence?.text || ""}
        onSave={saveToVault}
      />
    </>
  );
}
