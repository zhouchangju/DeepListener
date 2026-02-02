"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, RotateCcw, Check, SkipForward, Edit3, Download, Archive } from "lucide-react";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import { useRouter } from "next/navigation";
import SpeedSelector from "@/components/feature/SpeedSelector";
import { InteractiveText } from "@/components/feature/notation/InteractiveText";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";

export default function ReviewClient({ items, totalDue }: { items: any[], totalDue: number }) {
  const { setMode } = useTimeTracking();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const current = items[currentIndex];

  useEffect(() => {
    setMode("REVIEW");
    return () => setMode("IDLE");
  }, [setMode]);

  useEffect(() => {
    setShowAnswer(false);
    playAudio();
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !showAnswer && !isEditing) {
        setShowAnswer(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, isEditing]);

  // Sync playback rate in real-time
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Log playback
    fetch("/api/review/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewItemId: items[currentIndex].id }),
    }).catch(console.error);

    const audio = new Audio(items[currentIndex].sentence.track.audioUrl);
    audioRef.current = audio;
    
    audio.src = items[currentIndex].sentence.track.audioUrl;
    audio.currentTime = items[currentIndex].sentence.startTime;
    audio.playbackRate = playbackRate;
    
    const stopTime = items[currentIndex].sentence.endTime;
    
    const onTimeUpdate = () => {
      if (audio.currentTime >= stopTime) {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.play().catch(e => console.log("Auto-play prevented:", e));
  };

  const handleGrade = async (quality: "again" | "good") => {
    try {
      const res = await fetch("/api/review/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewItemId: current.id,
          quality,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success("Batch completed! Loading more...");
        window.location.reload();
      }
    } catch {
      toast.error("Failed to save progress");
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
        body: JSON.stringify({ type: 'due' }),
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

  const handleArchive = async () => {
    try {
      const res = await fetch(`/api/vault/${current.id}/archive`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to archive');

      const data = await res.json();

      toast.success(data.isArchived ? 'Note archived' : 'Note unarchived');

      // Move to next item
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success('Session completed!');
        window.location.reload();
      }
    } catch {
      toast.error('Failed to archive note');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex justify-between items-center px-2 text-sm text-gray-500">
            <span>Session: {currentIndex + 1} / {items.length} <span className="text-slate-400 ml-2">(Total Due: {totalDue})</span></span>
            <div className="flex items-center gap-2">
            <SpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} variant="minimal" />
            {showAnswer && (
                <>
                <Button variant="ghost" size="sm" className="h-8 text-gray-400" onClick={handleArchive}>
                  <Archive className="h-3 w-3 mr-1" /> Archive
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-gray-400" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-3 w-3 mr-1" /> Edit Note
                </Button>
                </>
            )}
            </div>
        </div>
        
        {/* Stats Bar */}
        <div className="flex justify-center gap-4 text-xs text-slate-400 bg-slate-50 py-1 rounded-md">
            <span>Total Listens: <span className="font-semibold text-slate-600">{current.stats?.totalListens || 0}</span></span>
            <span>Avg Daily: <span className="font-semibold text-slate-600">{current.stats?.averageDailyListens?.toFixed(1) || "0.0"}</span></span>
        </div>
      </div>

      <Card className="min-h-[300px] flex flex-col justify-between relative">
        <CardContent className="pt-10 text-center flex-grow">
          <Button 
            variant="secondary" 
            size="lg" 
            className="rounded-full h-16 w-16 mb-8"
            onClick={playAudio}
          >
            <Play className="h-8 w-8" />
          </Button>

          {showAnswer ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-center">
                <InteractiveText 
                  text={current.sentence.text} 
                  formatting={current.sentence.formatting}
                  mode="read"
                  className="text-lg font-medium leading-relaxed text-gray-800 text-center justify-center"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {current.tags.map((tag: any) => (
                  <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                ))}
              </div>
              {current.userNote && (
                <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded italic">
                  Note: {current.userNote}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 italic">Click play to listen. Press 'R' to reveal.</p>
          )}
        </CardContent>

        <CardFooter className="bg-gray-50/50 p-6 flex gap-4">
          {!showAnswer ? (
            <Button className="w-full" onClick={() => setShowAnswer(true)}>
              <Eye className="mr-2 h-4 w-4" /> Reveal Answer (R)
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="flex-1 border-red-200 hover:bg-red-50 text-red-600"
                onClick={() => handleGrade("again")}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Again
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleGrade("good")}
              >
                <Check className="mr-2 h-4 w-4" /> Good
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      <EditVaultModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        item={current}
        onSaved={() => {
            router.refresh();
            // Don't change index, and optionally hide answer if that's what user wanted
            // "且不要自动显示出reveal answer的内容" -> implies hiding it
            setShowAnswer(false);
        }}
      />

      <Button
        onClick={exportAudio}
        disabled={isExporting}
        className="fixed bottom-6 right-6 shadow-lg z-50"
        size="lg"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? 'Exporting...' : `Export Due (${totalDue})`}
      </Button>
    </div>
  );
}