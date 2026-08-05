"use client";

import { Button } from "@/components/ui/button";
import { Edit3, Check, Copy, CheckCircle2, RotateCcw } from "lucide-react";
import { useShadowingWorkflow } from "./shadowing/useShadowingWorkflow";
import {
  getDictationDraftStateForSentence,
  getInitialDictationDraftState,
  getShadowingAudioSliceKey,
  getShadowingOverlayClassName,
  type ShadowingPracticeMode,
} from "./shadowing/presentation";
import { compareDictationAnswer } from "./shadowing/dictation";
import DictationPanel from "./shadowing/DictationPanel";
import ShadowingHeader from "./shadowing/ShadowingHeader";
import ShadowingControls from "./shadowing/ShadowingControls";
import ShadowingVisualization from "./shadowing/ShadowingVisualization";
import { useShadowingKeyboard } from "./shadowing/useShadowingKeyboard";
import { useState, useEffect, useRef } from "react";
import { InteractiveText } from "./notation/InteractiveText";
import { NotationToolbar } from "./notation/NotationToolbar";
import { NotationType, SentenceFormatting } from "./notation/types";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { requireOkResponse } from "@/lib/client-response";

export function getShadowingActionButtonsClassName() {
  return "flex shrink-0 flex-row gap-1";
}

interface ShadowingConsoleProps {
  sentence: { id: string; text: string; startTime: number; endTime: number; formatting?: string | null; reviewItem?: object | null };
  fullAudioBuffer: AudioBuffer;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCapture: (sentenceId: string) => void;
  /** Optional: jump back to sentence 0 (used by the session-summary "practice again"). */
  onRestart?: () => void;
}

function parseSentenceFormatting(formatting?: string | null): SentenceFormatting {
  if (!formatting) return {};
  try {
    return JSON.parse(formatting) as SentenceFormatting;
  } catch {
    return {};
  }
}

function getSentenceStateKey(sentence: ShadowingConsoleProps["sentence"]) {
  return `${getShadowingAudioSliceKey(sentence)}:${sentence.text}:${sentence.formatting ?? ""}`;
}

export default function ShadowingConsole({
  sentence,
  fullAudioBuffer,
  currentIndex,
  totalCount,
  onClose,
  onNext,
  onPrev,
  onCapture,
  onRestart,
}: ShadowingConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("feature.shadowingConsole");
  const commonT = useTranslations("common");
  const { setMode } = useTimeTracking();
  const sentenceStateKey = getSentenceStateKey(sentence);
  const [activeSentenceStateKey, setActiveSentenceStateKey] = useState(sentenceStateKey);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [practiceMode, setPracticeMode] = useState<ShadowingPracticeMode>("shadowing");
  const [activeTool, setActiveTool] = useState<NotationType | null>(null);
  const [localFormatting, setLocalFormatting] = useState<SentenceFormatting>(() =>
    parseSentenceFormatting(sentence.formatting)
  );
  const [blindMode, setBlindMode] = useState(false);
  const [isTextRevealed, setIsTextRevealed] = useState(false);
  const [dictationDraft, setDictationDraft] = useState(() =>
    getInitialDictationDraftState(sentence)
  );
  const [isEditingText, setIsEditingText] = useState(false);
  const [tempText, setTempText] = useState(sentence.text);
  const [completed, setCompleted] = useState(false);

  const { mode, originalBlob, isOriginalBlobReady, userBlob, isLooping, startFlow, playOriginal, handleRecAgain, stopAll, toggleLoop } = useShadowingWorkflow({
    sentence,
    fullAudioBuffer,
    playbackRate,
    messages: { sliceFailed: t("sliceFailed"), micDenied: t("micDenied") },
  });
  const activeDictationDraft = getDictationDraftStateForSentence(dictationDraft, sentence);

  if (activeSentenceStateKey !== sentenceStateKey) {
    setActiveSentenceStateKey(sentenceStateKey);
    setLocalFormatting(parseSentenceFormatting(sentence.formatting));
    setTempText(sentence.text);
    setIsEditingText(false);
    setIsTextRevealed(false);
    setDictationDraft(getInitialDictationDraftState(sentence));
    setCompleted(false);
  }

  useEffect(() => {
    if (containerRef.current) containerRef.current.focus();
    setMode("SHADOWING");
    return () => setMode("LISTENING");
  }, [setMode]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (practiceMode !== "shadowing") return;
    const timer = setTimeout(() => playOriginal(), 500);
    return () => clearTimeout(timer);
  }, [sentence.id, playOriginal, practiceMode]);

  useEffect(() => {
    if (practiceMode !== "dictation" || !isOriginalBlobReady) return;
    if (activeDictationDraft.hasPlayedOnce || activeDictationDraft.result) return;
    const timer = window.setTimeout(() => {
      setDictationDraft({ ...activeDictationDraft, hasPlayedOnce: true });
      playOriginal();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [practiceMode, isOriginalBlobReady, activeDictationDraft, playOriginal]);

  const handleSaveText = async () => {
    try {
      const res = await fetch(`/api/sentence/${sentence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tempText, formatting: JSON.stringify(localFormatting) }),
      });
      await requireOkResponse(res, t("saveTextFailed"));
      // Preserve the current notation indices. We do not guess token-index
      // migrations here, but silently deleting the user's marks is worse.
      setIsEditingText(false);
      router.refresh();
      toast.success(t("textUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveTextFailed"));
    }
  };

  useEffect(() => {
    if (isEditingText) return;
    const timer = setTimeout(async () => {
      const currentJSON = JSON.stringify(localFormatting);
      if (currentJSON === sentence.formatting || (!sentence.formatting && currentJSON === "{}")) return;
      try {
        await fetch(`/api/sentence/${sentence.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formatting: currentJSON }),
        });
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [localFormatting, sentence.id, sentence.formatting, isEditingText]);

  const handleNext = () => { stopAll(); if (currentIndex < totalCount - 1) onNext(); };
  const handlePrev = () => { stopAll(); if (currentIndex > 0) onPrev(); };
  const handleClose = () => { stopAll(); onClose(); };
  // Completion moment: finishing the last sentence shows a calm session
  // summary instead of silently dead-ending on a disabled "next" button.
  const handleFinish = () => { stopAll(); setCompleted(true); };
  const handlePracticeAgain = () => {
    stopAll();
    setCompleted(false);
    onRestart?.();
  };

  const handlePracticeModeChange = (nextMode: ShadowingPracticeMode) => {
    if (practiceMode === nextMode) return;
    stopAll();
    setIsEditingText(false);
    setActiveTool(null);
    setPracticeMode(nextMode);
    if (nextMode === "dictation") {
      setDictationDraft((p) => getDictationDraftStateForSentence(p, sentence));
    }
  };

  const handleDictationAnswerChange = (answer: string) => {
    setDictationDraft((p) => ({ ...getDictationDraftStateForSentence(p, sentence), answer, result: null }));
  };

  const handleDictationPlay = () => {
    if (!isOriginalBlobReady) return;
    setDictationDraft((p) => {
      const current = getDictationDraftStateForSentence(p, sentence);
      return { ...current, hasPlayedOnce: true, replayCount: current.hasPlayedOnce ? current.replayCount + 1 : current.replayCount };
    });
    playOriginal();
  };

  const handleDictationSubmit = () => {
    setDictationDraft((p) => {
      const current = getDictationDraftStateForSentence(p, sentence);
      if (!current.answer.trim()) return current;
      return { ...current, result: compareDictationAnswer(sentence.text, current.answer) };
    });
  };

  const handleDictationRetry = () => { stopAll(); setDictationDraft(getInitialDictationDraftState(sentence)); };

  const handleKeyDown = useShadowingKeyboard({
    practiceMode,
    isEditingText,
    mode,
    activeTool,
    onEscape: handleClose,
    onPrev: handlePrev,
    onNext: handleNext,
    onStartFlow: startFlow,
    onStopAll: stopAll,
    onPlayOriginal: playOriginal,
    onSetActiveTool: (t) => setActiveTool(t as NotationType | null),
    onCapture: () => onCapture(sentence.id),
    onDictationPlay: handleDictationPlay,
    onDictationSubmit: handleDictationSubmit,
    sentenceId: sentence.id,
    sentenceText: sentence.text,
    copyToasts: { copied: t("copiedToast"), failed: t("copyFailed") },
  });

  return (
    <div className={getShadowingOverlayClassName()} tabIndex={-1} ref={containerRef} onKeyDown={handleKeyDown}>
      <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-3xl flex-col overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl shadow-black/30 custom-scrollbar sm:min-h-[500px]">
        <ShadowingHeader
          practiceMode={practiceMode}
          currentIndex={currentIndex}
          totalCount={totalCount}
          playbackRate={playbackRate}
          blindMode={blindMode}
          isBookmarked={!!sentence.reviewItem}
          onPracticeModeChange={handlePracticeModeChange}
          onPlaybackRateChange={setPlaybackRate}
          onToggleBlindMode={() => { setBlindMode(!blindMode); setIsTextRevealed(false); }}
          onCapture={() => onCapture(sentence.id)}
          onClose={handleClose}
        />

        {completed ? (
          <div className="flex-grow flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold">{t("completedTitle")}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {t("completedBody", { count: totalCount })}
            </p>
            <div className="mt-8 flex gap-3">
              {onRestart && (
                <Button variant="outline" onClick={handlePracticeAgain}>
                  <RotateCcw className="h-4 w-4 mr-2" /> {t("practiceAgain")}
                </Button>
              )}
              <Button onClick={handleClose}>{commonT("finish")}</Button>
            </div>
          </div>
        ) : (
          <>
        <div className="flex-grow flex flex-col items-center p-8 space-y-8 w-full relative">
          <div className="flex-grow flex flex-col items-center justify-center w-full relative gap-8">
            {practiceMode === "dictation" ? (
              <DictationPanel
                answer={activeDictationDraft.answer}
                result={activeDictationDraft.result}
                replayCount={activeDictationDraft.replayCount}
                hasPlayedOnce={activeDictationDraft.hasPlayedOnce}
                isAudioReady={isOriginalBlobReady}
                isListening={mode === "playing_original"}
                sentenceText={sentence.text}
                canGoNext={currentIndex < totalCount - 1}
                onAnswerChange={handleDictationAnswerChange}
                onPlay={handleDictationPlay}
                onSubmit={handleDictationSubmit}
                onRetry={handleDictationRetry}
                onNext={handleNext}
              />
            ) : isEditingText ? (
              <div className="w-full max-w-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                <Textarea aria-label={t("editText")} value={tempText} onChange={(e) => setTempText(e.target.value)} className="text-xl font-medium min-h-[120px] resize-none" />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingText(false)}>{commonT("cancel")}</Button>
                  <Button size="sm" onClick={handleSaveText} disabled={!tempText.trim()}>
                    <Check className="w-4 h-4 mr-2" /> {t("saveText")}
                  </Button>
                </div>
              </div>
            ) : blindMode && !isTextRevealed ? (
              <div
                className="relative group cursor-pointer w-full max-w-xl rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="button"
                tabIndex={0}
                aria-label={t("clickToReveal")}
                onClick={() => setIsTextRevealed(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setIsTextRevealed(true);
                  }
                }}
              >
                <div className="text-2xl font-medium text-muted-foreground/60 leading-loose text-center max-w-xl blur-sm select-none">{sentence.text}</div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-muted/95 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border">
                    {t("clickToReveal")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex w-full max-w-3xl items-start justify-center gap-3 group">
                <div className="min-w-0 flex-1 flex justify-center">
                  <InteractiveText
                    text={sentence.text}
                    formatting={localFormatting}
                    mode="edit"
                    activeTool={activeTool}
                    onChange={setLocalFormatting}
                    className="text-2xl font-medium text-foreground leading-loose text-center max-w-xl"
                  />
                </div>
                <div className={getShadowingActionButtonsClassName()}>
                  <Button size="icon" variant="ghost" className="h-12 w-12" onClick={() => setIsEditingText(true)} title={t("editText")} aria-label={t("editText")}>
                    <Edit3 className="w-6 h-6 text-muted-foreground hover:text-primary" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-12 w-12"
                    onClick={async () => { try { await navigator.clipboard.writeText(sentence.text); toast.success(t("copiedToast")); } catch { toast.error(t("copyFailed")); } }}
                    title={t("copyText")}
                    aria-label={t("copyText")}
                  >
                    <Copy className="w-6 h-6 text-muted-foreground hover:text-primary" />
                  </Button>
                </div>
              </div>
            )}
            {practiceMode === "shadowing" && !isEditingText && !blindMode && <NotationToolbar activeTool={activeTool} onToolChange={setActiveTool} />}
          </div>

          {practiceMode === "shadowing" && (
            <ShadowingVisualization
              sentenceId={sentence.id}
              mode={mode}
              originalBlob={originalBlob}
              isOriginalBlobReady={isOriginalBlobReady}
              userBlob={userBlob}
              playbackRate={playbackRate}
              isLooping={isLooping}
              onRecAgain={handleRecAgain}
              onToggleLoop={toggleLoop}
            />
          )}

          {practiceMode === "shadowing" && (
            <ShadowingControls mode={mode} onStartFlow={startFlow} onRecAgain={handleRecAgain} onNext={handleNext} />
          )}
        </div>

        <div className="bg-muted/60 p-4 flex justify-between border-t border-border">
          <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>{commonT("previous")}</Button>
          <div className="text-muted-foreground text-sm flex items-center">
            {practiceMode === "dictation" ? t("hintDictation") : mode === "reviewing" ? t("hintReviewing") : t("hintShadowing")}
          </div>
          {currentIndex === totalCount - 1 ? (
            <Button variant="ghost" onClick={handleFinish} className="text-primary">{t("finishSession")}</Button>
          ) : (
            <Button variant="ghost" onClick={handleNext}>{commonT("next")}</Button>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
