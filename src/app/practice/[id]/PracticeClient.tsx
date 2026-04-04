"use client";

import { useState, useEffect } from "react";

import AudioPlayer from "@/components/feature/AudioPlayer";

import DiagnosisModal from "@/components/feature/DiagnosisModal";

import ShadowingConsole from "@/components/feature/ShadowingConsole";
import { shouldRenderBackgroundAudioPlayer, shouldRenderTrackNotes } from "@/components/feature/shadowing/presentation";

import { Button } from "@/components/ui/button";

import { Eye, EyeOff, Mic2, Loader2, Edit3, Download } from "lucide-react";

import { toast } from "sonner";

import { fetchAndDecodeAudio } from "@/lib/audio-utils";

import NoteEditor from "@/components/feature/NoteEditor";

import RenameTrackModal from "@/components/feature/RenameTrackModal";

import { useRouter } from "next/navigation";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";



// Define strict types matching Prisma output

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  formatting?: string | null;
  reviewItem?: { tags?: { name: string }[]; userNote?: string | null; difficulty?: string } | null;
}



interface Track {
  id: string;
  title: string;
  audioUrl: string;
  note?: string | null;
  trackType?: string | null;
  trackTopic?: string | null;
  sentences: Sentence[];
}



interface PracticeClientProps {
  track: Track;
}



export default function PracticeClient({ track }: PracticeClientProps) {
  const router = useRouter();
  const { setMode } = useTimeTracking();

  useEffect(() => {
    setMode("LISTENING");
    return () => setMode("IDLE");
  }, [setMode]);

  const [capturingSentenceId, setCapturingSentenceId] = useState<string | null>(null);

  const [blindMode, setBlindMode] = useState(false);

  const [shadowingMode, setShadowingMode] = useState(false);

  const [shadowIndex, setShadowIndex] = useState(0);

  const [fullAudioBuffer, setFullAudioBuffer] = useState<AudioBuffer | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const [note, setNote] = useState<string | null>(track.note || null);

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

  const saveToVault = async (tags: string[], note: string, difficulty: string) => {
    if (!capturingSentenceId) return;

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: capturingSentenceId,
          tags,
          note,
          difficulty,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Added to your Vault!");
      setCapturingSentenceId(null);
      router.refresh();
    } catch {
      toast.error("Failed to save to vault");
    }
  };

  const exportAudio = async () => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/audio/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'track', trackId: track.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const filename = response.headers
        .get('Content-Disposition')
        ?.match(/filename="(.+)"/)?.[1] || 'DeepListener_Export.mp3';

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Audio exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export audio');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
           <h1 className="text-xl font-bold truncate max-w-[300px] md:max-w-md" title={track.title}>{track.title}</h1>
           <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
             <Edit3 className="h-4 w-4 text-gray-500" />
           </Button>
        </div>

        <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportAudio}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Audio'}
            </Button>

            <Button
              variant="secondary"
              className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              disabled={!fullAudioBuffer} // 只有加载完了才能进跟读
              onClick={() => { setShadowIndex(0); setShadowingMode(true); }}
            >
              {fullAudioBuffer ? <Mic2 className="h-4 w-4 mr-2" /> : <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {fullAudioBuffer ? "Shadowing" : "Loading..."}
            </Button>

            <Button
              variant={blindMode ? "default" : "outline"}
              onClick={() => setBlindMode(!blindMode)}
              size="icon"
              title="Blind Mode"
            >
              {blindMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
        </div>
      </div>

      {shouldRenderBackgroundAudioPlayer(shadowingMode) && (
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
      )}

      {shouldRenderTrackNotes(shadowingMode) && (
        <>
          <NoteEditor
            trackId={track.id}
            initialNote={note}
            onSaved={(content) => setNote(content)}
          />
        </>
      )}

      <DiagnosisModal
        key={capturingSentenceId ?? "closed"}
        isOpen={!!capturingSentenceId}
        onClose={() => setCapturingSentenceId(null)}
        sentenceText={currentSentence?.text || ""}
        onSave={saveToVault}
        initialTags={currentSentence?.reviewItem?.tags?.map((t) => t.name) || []}
        initialNote={currentSentence?.reviewItem?.userNote || ""}
        initialDifficulty={currentSentence?.reviewItem?.difficulty || "NORMAL"}
        shouldDefaultVocab={!currentSentence?.reviewItem}
      />
      
      <RenameTrackModal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        track={track} 
        onRenamed={() => router.refresh()} 
      />

      {shadowingMode && fullAudioBuffer && (
        <ShadowingConsole
          sentence={track.sentences[shadowIndex]}
          fullAudioBuffer={fullAudioBuffer}
          currentIndex={shadowIndex}
          totalCount={track.sentences.length}
          onClose={() => setShadowingMode(false)}
          onNext={() => setShadowIndex(prev => Math.min(prev + 1, track.sentences.length - 1))}
          onPrev={() => setShadowIndex(prev => Math.max(prev - 1, 0))}
          onCapture={handleCapture}
        />
      )}
    </>
  );
}
