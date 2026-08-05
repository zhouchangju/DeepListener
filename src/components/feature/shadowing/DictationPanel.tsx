"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check, Copy, Loader2, Play, RotateCcw, SkipForward, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("feature.dictation");
  const commonT = useTranslations("common");
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
      toast.success(t("copiedOriginal"));
    } catch {
      toast.error(t("copyOriginalFailed"));
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
            <Volume2 className="h-4 w-4 text-primary" />
            <span>{isListening ? t("listeningLabel") : t("dictationLabel")}</span>
          </div>
          <div className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
            {t("replays", { count: replayCount })}
          </div>
        </div>

        {!showResult ? (
          <div className="space-y-4">
            <Textarea
              ref={textareaRef}
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              disabled={!hasPlayedOnce || !isAudioReady}
              placeholder={isAudioReady ? t("placeholderReady") : t("placeholderPreparing")}
              aria-label={t("dictationLabel")}
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
                {hasPlayedOnce ? t("replay") : t("playOnce")}
              </Button>

              <Button
                type="button"
                className="gap-2"
                onClick={onSubmit}
                disabled={!answer.trim() || !hasPlayedOnce}
                title={t("submitTitle")}
              >
                <Check className="h-4 w-4" />
                {t("submit")}
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
                {result.isExactAfterNormalization ? t("perfect") : `${result.accuracy}%`}
              </div>
              <span className="text-sm text-muted-foreground">
                {t("missingExtra", { missing: result.missingWords.length, extra: result.extraWords.length })}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ResultBlock
                label={t("originalBlock")}
                text={sentenceText}
                RightAction={
                  showOriginalCopyButton ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      onClick={handleCopyOriginal}
                      title={t("copyOriginalTitle")}
                      aria-label={t("copyOriginalTitle")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  ) : null
                }
              />
              <ResultBlock label={t("yourAnswer")} text={answer} />
            </div>

            <div className="rounded-lg bg-card p-4 ring-1 ring-border">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("wordDiff")}
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
                className="gap-2 border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                onClick={onPlay}
                disabled={!canPlayResultAudio}
              >
                {!isAudioReady ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {t("playAudio")}
              </Button>
              <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" className="gap-2" onClick={onRetry}>
                <RotateCcw className="h-4 w-4" />
                {t("retry")}
              </Button>
              <Button type="button" className="gap-2" onClick={onNext} disabled={!canGoNext}>
                {commonT("next")}
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
      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
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
