"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, RotateCcw, Check, Edit3, Download, Archive, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import SpeedSelector from "@/components/feature/SpeedSelector";
import { InteractiveText } from "@/components/feature/notation/InteractiveText";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";

type ReviewQuality = "again" | "hard" | "good" | "easy";

type ReviewItem = {
  id: string;
  isArchived: boolean;
  userNote?: string | null;
  sentence: {
    text: string;
    formatting?: string | null;
    startTime: number;
    endTime: number;
    track: {
      audioUrl: string;
    };
  };
  tags: Array<{ id: string; name: string }>;
  stats?: {
    totalListens: number;
    averageDailyListens: number;
  };
  reviewedToday?: boolean;
};

type ReviewGradeResponse = {
  isArchived?: boolean;
};

type EditSavedItem = Partial<ReviewItem> & {
  tags?: string[];
};

export default function ReviewClient({
  items: initialItems,
  reviewedCount,
}: {
  items: ReviewItem[];
  reviewedCount: number;
}) {
  const { setMode } = useTimeTracking();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [reviewed, setReviewed] = useState(reviewedCount);
  const [remaining, setRemaining] = useState(initialItems.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = items[currentIndex];

  // Debug: Log initial props
  console.log('[ReviewClient] Initialized with reviewedCount:', reviewedCount, 'items.length:', initialItems.length);

  useEffect(() => {
    setReviewed(reviewedCount);
    setRemaining(initialItems.length);
    console.log('[ReviewClient] State updated - reviewed:', reviewedCount, 'remaining:', initialItems.length);
  }, [reviewedCount, initialItems.length]);

  useEffect(() => {
    const filtered = initialItems.filter((item) => !item.isArchived);

    if (filtered.length < items.length && currentIndex >= filtered.length) {
      setCurrentIndex(Math.max(0, filtered.length - 1));
    }

    setItems(filtered);
  }, [initialItems]);

  useEffect(() => {
    setMode("REVIEW");
    return () => setMode("IDLE");
  }, [setMode]);

  useEffect(() => {
    if (!current) return;
    setShowAnswer(false);
    playAudio();
  }, [currentIndex, current]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

      if (e.key === " " && !showAnswer) {
        e.preventDefault();
        setShowAnswer(true);
        return;
      }

      if (showAnswer) {
        switch (e.key.toLowerCase()) {
          case '1':
            handleGrade("again");
            break;
          case '2':
            handleGrade("hard");
            break;
          case '3':
            handleGrade("good");
            break;
          case '4':
            handleGrade("easy");
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, isEditing, currentIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const playAudio = () => {
    if (!current) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(current.sentence.track.audioUrl);
    audioRef.current = audio;

    audio.src = current.sentence.track.audioUrl;
    audio.currentTime = current.sentence.startTime;
    audio.playbackRate = playbackRate;

    const stopTime = current.sentence.endTime;

    const onTimeUpdate = () => {
      if (audio.currentTime >= stopTime) {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.play().catch(e => console.log("Auto-play prevented:", e));
  };

  const handleGrade = async (quality: ReviewQuality) => {
    if (!current) return;

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

      // Update counts
      setReviewed((prev) => prev + 1);
      setRemaining((prev) => Math.max(0, prev - 1));

      // Remove from current session for both 'again' and 'hard'
      if (quality === "again" || quality === "hard") {
        setItems(prevItems => {
          const newItems = [...prevItems];
          newItems.splice(currentIndex, 1);
          return newItems;
        });

        if (quality === "again") {
          toast.success("Scheduled for next day");
        } else {
          toast.success("Marked as hard - will review again tomorrow");
        }

        if (items.length === 1) {
          window.location.reload();
        }
      } else {
        if (currentIndex < items.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          toast.success("Batch completed! Loading more...");
          window.location.reload();
        }
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
    if (!current) return;

    try {
      const res = await fetch(`/api/vault/${current.id}/archive`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to archive');

      const data: ReviewGradeResponse = await res.json();

      toast.success(data.isArchived ? 'Note archived' : 'Note unarchived');

      if (data.isArchived) {
        setRemaining((prev) => Math.max(0, prev - 1));
      }

      setItems((prevItems) => {
        const newItems = [...prevItems];
        newItems.splice(currentIndex, 1);
        return newItems;
      });

      if (items.length === 1) {
        toast.success('Session completed!');
        window.location.reload();
      }
    } catch {
      toast.error('Failed to archive note');
    }
  };

  if (!current) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed">
        <p className="text-gray-500">No sentences due for review. Great job!</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4 flex flex-col gap-2">
        {/* Progress Bar - Simple & Clear */}
        <div className="flex items-center justify-between px-3 py-2 bg-white border border-gray-100 rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Reviewed</span>
              <span className="font-bold text-green-600">{reviewed}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">In Queue</span>
              <span className="font-bold text-blue-600">{remaining}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            <span>播放: {current.stats?.totalListens || 0}</span>
            <span className="text-slate-300 mx-1">|</span>
            <span>日均: {current.stats?.averageDailyListens?.toFixed(1) || "0.0"}</span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-2">
          <div className="w-24">
            <SpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} variant="minimal" />
          </div>
          {showAnswer && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-gray-400" onClick={handleArchive}>
                <Archive className="h-3.5 w-3.5 mr-1.5" /> 归档
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-gray-400" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-3.5 w-3.5 mr-1.5" /> 笔记
              </Button>
            </div>
          )}
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
                {current.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                ))}
              </div>
              {current.userNote && (
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 mb-1">NOTE:</div>
                  <div
                    className="prose prose-sm max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: current.userNote }}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 italic">Click play to listen. Press Space to reveal.</p>
          )}
        </CardContent>

        <CardFooter className="bg-gray-50/50 p-6 flex flex-col gap-3">
          {!showAnswer ? (
            <Button className="w-full" onClick={() => setShowAnswer(true)}>
              <Eye className="mr-2 h-4 w-4" /> Reveal Answer (Space)
            </Button>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 w-full">
                <Button
                  variant="outline"
                  className="border-red-200 hover:bg-red-50 text-red-600 flex-col h-auto py-3"
                  onClick={() => handleGrade("again")}
                >
                  <RotateCcw className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Again</span>
                  <span className="text-[10px] text-gray-400">1</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-orange-200 hover:bg-orange-50 text-orange-600 flex-col h-auto py-3"
                  onClick={() => handleGrade("hard")}
                >
                  <TrendingDown className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Hard</span>
                  <span className="text-[10px] text-gray-400">2</span>
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white flex-col h-auto py-3"
                  onClick={() => handleGrade("good")}
                >
                  <Check className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Good</span>
                  <span className="text-[10px] text-green-200">3</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-blue-200 hover:bg-blue-50 text-blue-600 flex-col h-auto py-3"
                  onClick={() => handleGrade("easy")}
                >
                  <TrendingUp className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Easy</span>
                  <span className="text-[10px] text-gray-400">4</span>
                </Button>
              </div>
            </>
          )}
        </CardFooter>
      </Card>

      <EditVaultModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        item={current}
        onSaved={(updatedItem: EditSavedItem | undefined) => {
            // Update local state instead of refreshing the entire page
            if (updatedItem) {
                setItems(prevItems =>
                    prevItems.map(item => {
                        if (item.id === current.id) {
                            // Convert tag names to tag objects format
                            const tagObjects = updatedItem.tags?.map(name => {
                                const existingTag = item.tags.find((t) => t.name === name);
                                return existingTag || { id: `temp-${name}`, name };
                            }) || item.tags;

                            return {
                                ...item,
                                ...updatedItem,
                                tags: tagObjects,
                            };
                        }
                        return item;
                    })
                );
            }
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
        {isExporting ? 'Exporting...' : `Export Due (${remaining})`}
      </Button>
    </div>
  );
}
