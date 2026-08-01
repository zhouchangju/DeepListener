"use client";

import { useState, useEffect, useEffectEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Download, Archive, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import SpeedSelector from "@/components/feature/SpeedSelector";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { downloadResponseBlob } from "@/lib/client-download";
import { requireOkResponse } from "@/lib/client-response";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getReviewKeyboardAction, type ReviewKeyboardGrade } from "./review-keyboard";
import { removeCurrentReviewItem } from "./review-queue";
import { useReviewAudio } from "./useReviewAudio";
import { ReviewCard } from "./ReviewCard";

type ReviewQuality = ReviewKeyboardGrade;

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
  const t = useTranslations("review");
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
  const { playAudio } = useReviewAudio({
    current,
    playbackRate,
    onPlaybackBlocked: () => {
      // Auto-play was blocked — give the user a visible reason + retry rather
      // than leaving them pressing play with no audio and no feedback.
      toast.error(t("playbackBlocked"), { action: { label: t("retry"), onClick: () => playAudio() } });
    },
  });

  // Mirror items/currentIndex in refs so async handlers (handleGrade) can
  // read the latest values after an `await` instead of the stale closure
  // captured at call time. Without this, rapid consecutive grades operate on
  // the pre-transition state and skip/duplicate cards.
  const itemsRef = useRef(items);
  const currentIndexRef = useRef(currentIndex);
  // Re-entry guard: while a grade is in flight, ignore subsequent grades so
  // the FSRS progression and the UI transition stay in sync.
  const gradingRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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
    if (gradingRef.current) return;
    const latestItems = itemsRef.current;
    const latestIndex = currentIndexRef.current;
    const itemToGrade = latestItems[latestIndex];
    if (!itemToGrade) return;

    gradingRef.current = true;
    try {
      const res = await fetch("/api/review/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewItemId: itemToGrade.id,
          quality,
        }),
      });

      await requireOkResponse(res, t("saveProgressFailed"));

      setReviewed((prev) => prev + 1);
      setRemaining((prev) => Math.max(0, prev - 1));

      // Read the freshest items/index from the refs again in case other
      // state updates landed during the await; fall back to the captured
      // snapshot if nothing changed.
      const transitionItems = itemsRef.current;
      const transitionIndex = currentIndexRef.current;
      const transition = removeCurrentReviewItem({ items: transitionItems, currentIndex: transitionIndex });
      setItems(transition.items);
      setCurrentIndex(transition.currentIndex);

      if (quality === "again" || quality === "hard") {
        if (quality === "again") {
          toast.success(t("againSoon5"));
        } else {
          toast.success(t("againSoon15"));
        }
      } else if (transition.completed) {
        toast.success(t("batchCompleted"));
      }

      if (transition.completed) {
        router.refresh();
      }
    } catch {
      toast.error(t("saveProgressFailed"));
    } finally {
      gradingRef.current = false;
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
      const action = getReviewKeyboardAction({ key: e.key, isEditing, target: e.target });
      if (!action) return;

      if (action.preventDefault) {
        e.preventDefault();
      }

      if (action.type === "toggle-answer") {
        setShowAnswer((prev) => !prev);
        return;
      }

      if (action.type === "play-audio") {
        playAudioInEffect();
        return;
      }

      if (action.type === "grade") {
        handleGradeInEffect(action.quality);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing]);

  const exportAudio = async () => {
    setIsExporting(true);
    // Exports run ffmpeg server-side and can take a while. A static spinner
    // looks frozen on long exports, so refresh a toast with elapsed time so
    // the user knows it is progressing.
    const toastId = toast.loading(t("exporting"));
    const startedAt = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      toast.loading(t("exportingProgress", { elapsed }), { id: toastId });
    }, 5000);

    try {
      const response = await fetch('/api/audio/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'due' }),
      });

      await requireOkResponse(response, t("audioExportFailed"));

      await downloadResponseBlob(response, 'DeepListener_Export.mp3');

      toast.success(t("audioExported"), { id: toastId });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : t("audioExportFailed"), { id: toastId });
    } finally {
      clearInterval(progressTimer);
      setIsExporting(false);
    }
  };

  const handleArchive = async () => {
    if (!current) return;

    try {
      const res = await fetch(`/api/vault/${current.id}/archive`, {
        method: 'POST',
      });

      await requireOkResponse(res, t("archiveFailed"));

      const data: ReviewGradeResponse = await res.json();

      toast.success(data.isArchived ? t("noteArchived") : t("noteUnarchived"));

      if (data.isArchived) {
        setRemaining((prev) => Math.max(0, prev - 1));
      }

      const transition = removeCurrentReviewItem({ items, currentIndex });
      setItems(transition.items);
      setCurrentIndex(transition.currentIndex);

      if (transition.completed) {
        toast.success(t("sessionCompleted"));
        router.refresh();
      }
    } catch {
      toast.error(t("archiveFailed"));
    }
  };

  if (!current) {
    // Completion moment: the queue is empty. If the user actually graded
    // cards this session, celebrate (calmly) and show the count; otherwise
    // it's the plain "nothing due" state.
    if (reviewed > 0) {
      return (
        <div className="mx-auto max-w-md text-center py-16 px-8 bg-card rounded-xl border shadow-card animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold">{t("completedTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("completedBody", { count: reviewed })}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/library">{t("goLibrary")}</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-dashed">
        <p className="text-muted-foreground">{t("noDue")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4 flex flex-col gap-2">
        {/* Progress Bar - Simple & Clear */}
        <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("reviewed")}</span>
              <span className="font-bold text-success tabular-nums">{reviewed}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("queue")}</span>
              <span className="font-bold text-primary tabular-nums">{remaining}</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <span>{t("playsLabel", { count: current.stats?.totalListens || 0 })}</span>
            <span className="text-muted-foreground/50 mx-1">|</span>
            <span>{t("dailyAvgLabel", { value: current.stats?.averageDailyListens?.toFixed(1) || "0.0" })}</span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-2">
          <div className="w-24">
            <SpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} variant="minimal" />
          </div>
          {showAnswer && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={handleArchive}>
                <Archive className="h-3.5 w-3.5 mr-1.5" /> {t("archiveAction")}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-3.5 w-3.5 mr-1.5" /> {t("noteAction")}
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
        {isExporting ? t("exporting") : t("exportDue", { count: remaining })}
      </Button>
    </div>
  );
}
