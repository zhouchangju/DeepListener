"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check, Copy, Loader2, Play, RotateCcw, SkipForward, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DictationComparison, DictationWordDiff } from "./dictation";
import {
  shouldEnableDictationResultPlayback,
  shouldShowDictationOriginalCopyButton,
  shouldShowDictationResult,
} from "./presentation";

interface DictationPanelProps {
  answer: string;
  result: DictationComparison | null;
  replayCount: number;
  hasPlayedOnce: boolean;
  isAudioReady: boolean;
  isListening: boolean;
  sentenceText: string;
  canGoNext: boolean;
  onAnswerChange: (answer: string) => void;
  onPlay: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onNext: () => void;
}

export default function DictationPanel({
  answer,
  result,
  replayCount,
  hasPlayedOnce,
  isAudioReady,
  isListening,
  sentenceText,
  canGoNext,
  onAnswerChange,
  onPlay,
  onSubmit,
  onRetry,
  onNext,
}: DictationPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showResult = shouldShowDictationResult(result);
  const canPlayResultAudio = shouldEnableDictationResultPlayback(
    result,
    isAudioReady
  );
  const showOriginalCopyButton = shouldShowDictationOriginalCopyButton(result);

  const handleCopyOriginal = async () => {
    try {
      await navigator.clipboard.writeText(sentenceText);
      toast.success("Original text copied");
    } catch {
      toast.error("Failed to copy original text");
    }
  };

  useEffect(() => {
    if (hasPlayedOnce && !showResult) {
      textareaRef.current?.focus();
    }
  }, [hasPlayedOnce, showResult]);

  return (
    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="rounded-xl border border-border bg-muted/60 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Volume2 className="h-4 w-4 text-indigo-500" />
            <span>{isListening ? "Listening..." : "Dictation"}</span>
          </div>
          <div className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
            Replays: {replayCount}
          </div>
        </div>

        {!showResult ? (
          <div className="space-y-4">
            <Textarea
              ref={textareaRef}
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              disabled={!hasPlayedOnce || !isAudioReady}
              placeholder={isAudioReady ? "Write what you heard..." : "Preparing audio..."}
              className="min-h-[150px] resize-none border-input bg-background text-lg leading-relaxed text-foreground placeholder:text-muted-foreground"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onPlay}
                disabled={!isAudioReady}
              >
                {!isAudioReady ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {hasPlayedOnce ? "Replay" : "Play Once"}
              </Button>

              <Button
                type="button"
                className="gap-2"
                onClick={onSubmit}
                disabled={!answer.trim() || !hasPlayedOnce}
                title="Submit (Cmd+Enter)"
              >
                <Check className="h-4 w-4" />
                Submit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                  result.isExactAfterNormalization
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {result.isExactAfterNormalization ? "Perfect" : `${result.accuracy}%`}
              </div>
              <span className="text-sm text-muted-foreground">
                Missing {result.missingWords.length} | Extra {result.extraWords.length}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ResultBlock
                label="Original"
                text={sentenceText}
                RightAction={
                  showOriginalCopyButton ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600"
                      onClick={handleCopyOriginal}
                      title="Copy original text"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  ) : null
                }
              />
              <ResultBlock label="Your Answer" text={answer} />
            </div>

            <div className="rounded-lg bg-card p-4 ring-1 ring-border">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Word Diff
              </div>
              <div className="flex flex-wrap gap-2 text-sm leading-7">
                {result.wordDiff.map((item, index) => (
                  <DiffToken key={`${index}-${getDiffTokenText(item)}`} item={item} />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                onClick={onPlay}
                disabled={!canPlayResultAudio}
              >
                {!isAudioReady ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Play Audio
              </Button>
              <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" className="gap-2" onClick={onRetry}>
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
              <Button type="button" className="gap-2" onClick={onNext} disabled={!canGoNext}>
                Next
                <SkipForward className="h-4 w-4" />
              </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultBlock({
  label,
  text,
  RightAction,
}: {
  label: string;
  text: string;
  RightAction?: ReactNode;
}) {
  return (
    <div className={`relative rounded-lg bg-card p-3 ring-1 ring-border ${RightAction ? "pr-12" : ""}`}>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-relaxed text-foreground">{text}</div>
      {RightAction}
    </div>
  );
}

function DiffToken({ item }: { item: DictationWordDiff }) {
  if (item.status === "correct") {
    return (
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
        {item.expected}
      </span>
    );
  }

  if (item.status === "missing") {
    return (
      <span className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700 line-through decoration-red-400">
        {item.expected}
      </span>
    );
  }

  if (item.status === "extra") {
    return (
      <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
        + {item.actual}
      </span>
    );
  }

  return (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
      {item.expected} / {item.actual}
    </span>
  );
}

function getDiffTokenText(item: DictationWordDiff) {
  if (item.status === "extra") return item.actual;
  if (item.status === "missing") return item.expected;
  return `${item.expected}-${item.actual}`;
}
