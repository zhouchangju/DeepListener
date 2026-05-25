"use client";

import { useState, useEffect, useEffectEvent } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Download, Archive } from "lucide-react";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import SpeedSelector from "@/components/feature/SpeedSelector";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { downloadResponseBlob } from "@/lib/client-download";
import { useRouter } from "next/navigation";
import { removeCurrentReviewItem } from "./review-queue";
import { useReviewAudio } from "./useReviewAudio";
import { ReviewCard } from "./ReviewCard";

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
      id: string;
      audioUrl: string;
      title: string;
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

type EditSavedItem = {
  userNote?: string | null;
  difficulty?: string;
  tags?: string[];
};

export default function ReviewClient({
  items: initialItems,
  reviewedCount,
}: {
  items: ReviewItem[];
  reviewedCount: number;
}) {
  const router = useRouter();
  const { setMode } = useTimeTracking();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [reviewed, setReviewed] = useState(reviewedCount);
  const [remaining, setRemaining] = useState(initialItems.length);

  const current = items[currentIndex];
  const { playAudio } = useReviewAudio({ current, playbackRate });

  useEffect(() => {
    setReviewed(reviewedCount);
    setRemaining(initialItems.length);
  }, [reviewedCount, initialItems.length]);

  useEffect(() => {
    const filtered = initialItems.filter((item) => !item.isArchived);
    setItems(filtered);
    setCurrentIndex((prevIndex) => Math.min(prevIndex, Math.max(0, filtered.length - 1)));
  }, [initialItems]);

  useEffect(() => {
    setMode("REVIEW");
    return () => setMode("IDLE");
  }, [setMode]);

  // Close help tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showHelpTooltip) {
        setShowHelpTooltip(false);
      }
    };
    if (showHelpTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showHelpTooltip]);

  const playAudioInEffect = useEffectEvent(() => {
    playAudio();
  });

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

      setReviewed((prev) => prev + 1);
      setRemaining((prev) => Math.max(0, prev - 1));

      const transition = removeCurrentReviewItem({ items, currentIndex });
      setItems(transition.items);
      setCurrentIndex(transition.currentIndex);

      if (quality === "again" || quality === "hard") {
        if (quality === "again") {
          toast.success("Will review again in 5 minutes");
        } else {
          toast.success("Will review again in 15 minutes");
        }
      } else if (transition.completed) {
        toast.success("Batch completed! Loading more...");
      }

      if (transition.completed) {
        router.refresh();
      }
    } catch {
      toast.error("Failed to save progress");
    }
  };

  const handleGradeInEffect = useEffectEvent((quality: ReviewQuality) => {
    void handleGrade(quality);
  });

  useEffect(() => {
    if (!current) return;
    setShowAnswer(false);
    const timer = setTimeout(() => {
      playAudioInEffect();
    }, 500);
    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

      if (e.key === " ") {
        e.preventDefault();
        setShowAnswer((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        playAudioInEffect();
        return;
      }

      switch (e.key.toLowerCase()) {
        case "1":
          handleGradeInEffect("again");
          break;
        case "2":
          handleGradeInEffect("hard");
          break;
        case "3":
          handleGradeInEffect("good");
          break;
        case "4":
          handleGradeInEffect("easy");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing]);

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

      await downloadResponseBlob(response, 'DeepListener_Export.mp3');

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

      const transition = removeCurrentReviewItem({ items, currentIndex });
      setItems(transition.items);
      setCurrentIndex(transition.currentIndex);

      if (transition.completed) {
        toast.success('Session completed!');
        router.refresh();
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

      <ReviewCard
        current={current}
        showAnswer={showAnswer}
        showHelpTooltip={showHelpTooltip}
        onToggleHelpTooltip={() => setShowHelpTooltip(!showHelpTooltip)}
        onPlayAudio={playAudio}
        onToggleAnswer={() => setShowAnswer(!showAnswer)}
        onGrade={handleGrade}
      />

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
