"use client";

import { useState, useEffect } from "react";

import AudioPlayer from "@/components/feature/AudioPlayer";

import DiagnosisModal from "@/components/feature/DiagnosisModal";

import ShadowingConsole from "@/components/feature/ShadowingConsole";

import { Button } from "@/components/ui/button";

import { Eye, EyeOff, Mic2, Loader2 } from "lucide-react";

import { toast } from "sonner";

import { fetchAndDecodeAudio } from "@/lib/audio-utils";

import NoteEditor from "@/components/feature/NoteEditor";



// Define strict types matching Prisma output

interface Sentence {

  id: string;

  text: string;

  startTime: number;

  endTime: number;

}



interface Track {

  id: string;

  title: string;

  audioUrl: string;

  note?: string | null;

  sentences: Sentence[];

}



interface PracticeClientProps {

  track: Track;

}



export default function PracticeClient({ track }: PracticeClientProps) {

  const [capturingSentenceId, setCapturingSentenceId] = useState<string | null>(null);

  const [blindMode, setBlindMode] = useState(false);

  const [shadowingMode, setShadowingMode] = useState(false);

  const [shadowIndex, setShadowIndex] = useState(0);

  const [fullAudioBuffer, setFullAudioBuffer] = useState<AudioBuffer | null>(null);



  // 预加载音频 Buffer，为了 Shadowing 模式下的极速切片

  useEffect(() => {

    fetchAndDecodeAudio(track.audioUrl)

      .then(buffer => setFullAudioBuffer(buffer))

      .catch(err => console.error("Audio preload failed", err));

  }, [track.audioUrl]);



  const handleCapture = (sentenceId: string) => {

    setCapturingSentenceId(sentenceId);

  };



  const currentSentence = track.sentences.find((s) => s.id === capturingSentenceId);



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

    } catch {

      toast.error("Failed to save to vault");

    }

  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="secondary"
          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          disabled={!fullAudioBuffer} // 只有加载完了才能进跟读
          onClick={() => { setShadowIndex(0); setShadowingMode(true); }}
        >
          {fullAudioBuffer ? <Mic2 className="h-4 w-4 mr-2" /> : <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {fullAudioBuffer ? "Start Shadowing" : "Preparing Audio..."}
        </Button>

        <Button 
          variant={blindMode ? "default" : "outline"}
          onClick={() => setBlindMode(!blindMode)}
          className="gap-2"
        >
          {blindMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {blindMode ? "Blind Mode: ON" : "Blind Mode: OFF"}
        </Button>
      </div>

      <AudioPlayer 
        audioUrl={track.audioUrl} 
        sentences={track.sentences} 
        onCapture={handleCapture}
        blindMode={blindMode}
        onShadowing={(index) => {
          setShadowIndex(index);
          setShadowingMode(true);
        }}
      />
      
      <NoteEditor trackId={track.id} initialNote={track.note} />

      <DiagnosisModal
        isOpen={!!capturingSentenceId}
        onClose={() => setCapturingSentenceId(null)}
        sentenceText={currentSentence?.text || ""}
        onSave={saveToVault}
      />

      {shadowingMode && fullAudioBuffer && (
        <ShadowingConsole
          sentence={track.sentences[shadowIndex]}
          fullAudioBuffer={fullAudioBuffer}
          onClose={() => setShadowingMode(false)}
          onNext={() => setShadowIndex(prev => Math.min(prev + 1, track.sentences.length - 1))}
          onPrev={() => setShadowIndex(prev => Math.max(prev - 1, 0))}
        />
      )}
    </>
  );
}