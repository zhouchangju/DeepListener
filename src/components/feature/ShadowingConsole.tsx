"use client";

import { Button } from "@/components/ui/button";
import { Mic, Play, RotateCcw, SkipForward, X, Loader2, Repeat, Pause, Edit3, Check, Bookmark, BookmarkCheck, Copy, Eye, EyeOff, Keyboard } from "lucide-react";
import MiniWavePlayer from "./MiniWavePlayer";
import { useShadowingWorkflow } from "./shadowing/useShadowingWorkflow";
import {
  getDictationDraftStateForSentence,
  getInitialDictationDraftState,
  getPracticeModeButtonClassName,
  getShadowingOverlayClassName,
  isDictationSubmitShortcut,
  shouldRenderOriginalWavePlayer,
  type ShadowingPracticeMode,
} from "./shadowing/presentation";
import { compareDictationAnswer } from "./shadowing/dictation";
import DictationPanel from "./shadowing/DictationPanel";
import SpeedSelector from "./SpeedSelector";
import { useState, useEffect, useRef } from "react";
import { InteractiveText } from "./notation/InteractiveText";
import { NotationToolbar } from "./notation/NotationToolbar";
import { NotationType, SentenceFormatting } from "./notation/types";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";

export function getShadowingActionButtonsClassName() {
  return "absolute right-0 top-0 z-10 flex flex-row gap-1";
}

function isEditableKeyTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
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
}: ShadowingConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setMode } = useTimeTracking();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [practiceMode, setPracticeMode] = useState<ShadowingPracticeMode>("shadowing");
  const [activeTool, setActiveTool] = useState<NotationType | null>(null);
  const [localFormatting, setLocalFormatting] = useState<SentenceFormatting>({});
  const [blindMode, setBlindMode] = useState(false);
  const [isTextRevealed, setIsTextRevealed] = useState(false);
  const [dictationDraft, setDictationDraft] = useState(() =>
    getInitialDictationDraftState(sentence)
  );

  // Text Editing State
  const [isEditingText, setIsEditingText] = useState(false);
  const [tempText, setTempText] = useState(sentence.text);

  const { mode, originalBlob, isOriginalBlobReady, userBlob, isLooping, startFlow, playOriginal, handleRecAgain, stopAll, toggleLoop } = useShadowingWorkflow({
    sentence,
    fullAudioBuffer,
    playbackRate,
  });
  const activeDictationDraft = getDictationDraftStateForSentence(
    dictationDraft,
    sentence
  );

  // Focus on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
    setMode("SHADOWING");
    return () => setMode("LISTENING");
  }, [setMode]);

  // Load formatting when sentence changes
  useEffect(() => {
    if (sentence.formatting) {
      try {
        setLocalFormatting(JSON.parse(sentence.formatting));
      } catch {
        setLocalFormatting({});
      }
    } else {
      setLocalFormatting({});
    }
    setTempText(sentence.text); // Sync temp text
    setIsEditingText(false); // Reset edit mode
    setIsTextRevealed(false); // Reset text reveal
    setDictationDraft(getInitialDictationDraftState(sentence));
  }, [sentence]);

  // Auto-play original audio after 0.5s when switching to next sentence
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (practiceMode !== "shadowing") return;

    // Auto-start playback after 0.5s delay (without auto-recording)
    const timer = setTimeout(() => {
      playOriginal();
    }, 500);

    return () => clearTimeout(timer);
  }, [sentence.id, playOriginal, practiceMode]);

  useEffect(() => {
    if (practiceMode !== "dictation" || !isOriginalBlobReady) return;
    if (activeDictationDraft.hasPlayedOnce || activeDictationDraft.result) return;

    setDictationDraft({
      ...activeDictationDraft,
      hasPlayedOnce: true,
    });
    playOriginal();
  }, [practiceMode, isOriginalBlobReady, activeDictationDraft, playOriginal]);

  const handleSaveText = async () => {
    try {
      const res = await fetch(`/api/sentence/${sentence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            text: tempText,
            formatting: null // Reset formatting on text change
        }),
      });
      
      if (!res.ok) throw new Error("Failed to update text");
      
      setLocalFormatting({});
      setIsEditingText(false);
      router.refresh();
      toast.success("Text updated");
    } catch {
      toast.error("Failed to save text");
    }
  };

  // Auto-save formatting
  useEffect(() => {
    if (isEditingText) return; // Don't auto-save formatting while editing text

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

  const handleNext = () => {
    stopAll();
    if (currentIndex < totalCount - 1) onNext();
  };

  const handlePrev = () => {
    stopAll();
    if (currentIndex > 0) onPrev();
  };

  const handleClose = () => {
    stopAll();
    onClose();
  };

  const handlePracticeModeChange = (nextMode: ShadowingPracticeMode) => {
    if (practiceMode === nextMode) return;

    stopAll();
    setIsEditingText(false);
    setActiveTool(null);
    setPracticeMode(nextMode);

    if (nextMode === "dictation") {
      setDictationDraft((previous) =>
        getDictationDraftStateForSentence(previous, sentence)
      );
    }
  };

  const handleDictationAnswerChange = (answer: string) => {
    setDictationDraft((previous) => ({
      ...getDictationDraftStateForSentence(previous, sentence),
      answer,
      result: null,
    }));
  };

  const handleDictationPlay = () => {
    if (!isOriginalBlobReady) return;

    setDictationDraft((previous) => {
      const current = getDictationDraftStateForSentence(previous, sentence);

      return {
        ...current,
        hasPlayedOnce: true,
        replayCount: current.hasPlayedOnce
          ? current.replayCount + 1
          : current.replayCount,
      };
    });
    playOriginal();
  };

  const handleDictationSubmit = () => {
    setDictationDraft((previous) => {
      const current = getDictationDraftStateForSentence(previous, sentence);

      if (!current.answer.trim()) {
        return current;
      }

      return {
        ...current,
        result: compareDictationAnswer(sentence.text, current.answer),
      };
    });
  };

  const handleDictationRetry = () => {
    stopAll();
    setDictationDraft(getInitialDictationDraftState(sentence));
  };

  // Centralized Keyboard Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (practiceMode === "dictation" && isDictationSubmitShortcut(e)) {
      e.preventDefault();
      e.stopPropagation();
      handleDictationSubmit();
      return;
    }

    if (isEditingText || isEditableKeyTarget(e.target)) {
        e.stopPropagation(); // Allow typing in textarea
        return;
    }

    e.stopPropagation(); // Stop event from bubbling to background player

    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (practiceMode === "dictation") {
      if (e.key === "r" || e.key === "R" || e.key === " " || e.code === "Space") {
        e.preventDefault();
        handleDictationPlay();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        onCapture(sentence.id);
      }
    } else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (mode === "idle") {
        startFlow();
      } else {
        stopAll();
      }
    } else if (e.key === "r" || e.key === "R") {
      // R - Replay original audio
      e.preventDefault();
      playOriginal();
    } else if (e.key === "t" || e.key === "T") {
      // T - Toggle stress notation tool
      e.preventDefault();
      setActiveTool(activeTool === "stress" ? null : "stress");
    } else if (e.key === "c" || e.key === "C") {
      // C - Copy text to clipboard
      e.preventDefault();
      (async () => {
        try {
          await navigator.clipboard.writeText(sentence.text);
          toast.success("Copied to clipboard");
        } catch {
          toast.error("Failed to copy");
        }
      })();
    } else if (e.key === "n" || e.key === "N") {
      // N - Open note capture modal
      e.preventDefault();
      onCapture(sentence.id);
    }
  };

  return (
    <div 
      className={getShadowingOverlayClassName()}
      tabIndex={-1}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-slate-800">
              {practiceMode === "shadowing" ? (
                <>Shadowing Mode(<span style={{ color: "red" }}>抓主谓宾/Chunk</span>)</>
              ) : (
                "Dictation Mode"
              )}
            </h2>
            <div className="text-sm font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
              {currentIndex + 1} / {totalCount}
            </div>
            <div className="flex rounded-xl bg-slate-100 p-1.5 ring-1 ring-slate-200">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={getPracticeModeButtonClassName("shadowing", practiceMode)}
                aria-pressed={practiceMode === "shadowing"}
                onClick={() => handlePracticeModeChange("shadowing")}
              >
                <Mic className="h-4 w-4" />
                Shadowing
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={getPracticeModeButtonClassName("dictation", practiceMode)}
                aria-pressed={practiceMode === "dictation"}
                onClick={() => handlePracticeModeChange("dictation")}
              >
                <Keyboard className="h-4 w-4" />
                Dictation
              </Button>
            </div>
            <SpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} variant="minimal" />
            {practiceMode === "shadowing" && (
              <Button
                variant="ghost"
                size="icon"
                className={blindMode ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:text-indigo-600"}
                onClick={() => {
                  setBlindMode(!blindMode);
                  setIsTextRevealed(false);
                }}
                title={blindMode ? "Show text" : "Hide text"}
              >
                {blindMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={sentence.reviewItem ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-indigo-600"}
              onClick={() => onCapture(sentence.id)}
            >
              {sentence.reviewItem ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
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
                <Textarea
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  className="text-xl font-medium min-h-[120px] resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingText(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveText} disabled={!tempText.trim()}>
                    <Check className="w-4 h-4 mr-2" /> Save Text
                  </Button>
                </div>
              </div>
            ) : blindMode && !isTextRevealed ? (
                <div
                    className="relative group cursor-pointer"
                    onClick={() => setIsTextRevealed(true)}
                >
                    <div className="text-2xl font-medium text-slate-300 leading-loose text-center max-w-xl blur-sm select-none">
                        {sentence.text}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-slate-100/90 px-4 py-2 rounded-lg text-slate-500 text-sm font-medium">
                            <Eye className="h-4 w-4 inline mr-1" /> Click to reveal text
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative w-full group">
                    <div className="flex justify-center">
                        <InteractiveText
                        text={sentence.text}
                        formatting={localFormatting}
                        mode="edit"
                        activeTool={activeTool}
                        onChange={setLocalFormatting}
                        className="text-2xl font-medium text-slate-700 leading-loose text-center max-w-xl"
                        />
                    </div>
                    {/* Action Buttons - fixed to container's top-right edge */}
                    <div className={getShadowingActionButtonsClassName()}>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-12 w-12"
                            onClick={() => setIsEditingText(true)}
                            title="Edit Text"
                        >
                            <Edit3 className="w-6 h-6 text-slate-400 hover:text-indigo-600" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-12 w-12"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(sentence.text);
                                    toast.success("Copied to clipboard");
                                } catch {
                                    toast.error("Failed to copy");
                                }
                            }}
                            title="Copy text"
                        >
                            <Copy className="w-6 h-6 text-slate-400 hover:text-indigo-600" />
                        </Button>
                    </div>
                </div>
            )}

            {practiceMode === "shadowing" && !isEditingText && !blindMode && <NotationToolbar activeTool={activeTool} onToolChange={setActiveTool} />}
          </div>

          {/* Visualization Area */}
          {practiceMode === "shadowing" && (
          <div className="w-full space-y-4">
            {!isOriginalBlobReady && !originalBlob && (
              <div className="flex items-center justify-center text-slate-400 gap-2 h-32">
                <Loader2 className="h-6 w-6 animate-spin" /> Loading audio segment...
              </div>
            )}

            {shouldRenderOriginalWavePlayer(mode, !!originalBlob) && originalBlob && (
              <div className={mode === "reviewing" ? "" : "opacity-80"}>
                <MiniWavePlayer
                  audioBlob={originalBlob}
                  label="Original"
                  waveColor="#94a3b8"
                  progressColor="#475569"
                  playbackRate={playbackRate}
                  enableRegions={true}
                  loop={isLooping}
                  RightAction={
                     <Button 
                      size="icon" 
                      variant={isLooping ? "default" : "secondary"}
                      className={`rounded-full h-10 w-10 shrink-0 shadow-sm ${isLooping ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white hover:bg-slate-100"}`}
                      onClick={toggleLoop}
                      title="Loop Playback"
                     >
                        {isLooping ? <Pause className="h-4 w-4" /> : <Repeat className="h-4 w-4 text-slate-700" />}
                     </Button>
                  }
                />
              </div>
            )}

            {mode === "recording" && (
              <div className="h-20 flex items-center justify-center gap-4">
                <div className="flex items-center justify-center text-red-500 animate-pulse font-bold text-lg gap-2 bg-red-50 rounded-lg border border-red-100 px-6 py-2">
                  <Mic className="h-6 w-6" /> Recording...
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                  onClick={handleRecAgain}
                >
                  <RotateCcw className="h-4 w-4" /> Restart
                </Button>
              </div>
            )}

            {mode === "reviewing" && userBlob && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <MiniWavePlayer
                  key={sentence.id + "-user"}
                  audioBlob={userBlob}
                  label="Your Voice"
                  waveColor="#fca5a5"
                  progressColor="#e11d48"
                  autoPlay={true}
                />
              </div>
            )}
          </div>
          )}

          {/* Controls */}
          {practiceMode === "shadowing" && (
          <div className="h-16 flex items-center justify-center w-full relative">
            {mode === "idle" && (
              <Button
                size="lg"
                className="rounded-full px-8 text-lg gap-2 shadow-lg shadow-indigo-200"
                onClick={startFlow}
              >
                <Play className="h-5 w-5" /> Start Challenge
              </Button>
            )}

            {mode === "playing_original" && (
              <div className="text-indigo-600 animate-pulse font-bold text-lg flex items-center gap-2">
                <Play className="h-6 w-6" /> Listening...
              </div>
            )}

            {mode === "reviewing" && (
              <div className="flex gap-4">
                <Button variant="outline" size="lg" onClick={startFlow} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Full Retry
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 gap-2"
                  onClick={handleRecAgain}
                >
                  <Mic className="h-4 w-4" /> Rec Again
                </Button>
                <Button size="lg" onClick={handleNext} className="gap-2">
                  Next <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex justify-between border-t">
          <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>
            Previous
          </Button>
          <div className="text-slate-400 text-sm flex items-center">
            {practiceMode === "dictation"
              ? "Listen -> Type -> Check"
              : mode === "reviewing"
              ? "Compare waveforms & audio"
              : "Listen -> Record -> Compare"}
          </div>
          <Button variant="ghost" onClick={handleNext} disabled={currentIndex === totalCount - 1}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
