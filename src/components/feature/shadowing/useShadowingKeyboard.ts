"use client";

import { useCallback } from "react";
import type { ShadowingPracticeMode } from "./presentation";
import { isDictationSubmitShortcut } from "./presentation";

interface ShadowingKeyboardOptions {
  practiceMode: ShadowingPracticeMode;
  isEditingText: boolean;
  mode: string;
  activeTool: string | null;
  onEscape: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStartFlow: () => void;
  onStopAll: () => void;
  onPlayOriginal: () => void;
  onSetActiveTool: (tool: string | null) => void;
  onCapture: (sentenceId: string) => void;
  onDictationPlay: () => void;
  onDictationSubmit: () => void;
  sentenceId: string;
  sentenceText: string;
  /** Localized strings for clipboard toasts (previously hardcoded English). */
  copyToasts?: { copied: string; failed: string };
}

function isEditableKeyTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function useShadowingKeyboard({
  practiceMode,
  isEditingText,
  mode,
  activeTool,
  onEscape,
  onPrev,
  onNext,
  onStartFlow,
  onStopAll,
  onPlayOriginal,
  onSetActiveTool,
  onCapture,
  onDictationPlay,
  onDictationSubmit,
  sentenceId,
  sentenceText,
  copyToasts,
}: ShadowingKeyboardOptions) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      if (practiceMode === "dictation" && isDictationSubmitShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        onDictationSubmit();
        return;
      }

      if (isEditingText || isEditableKeyTarget(e.target)) {
        e.stopPropagation();
        return;
      }

      e.stopPropagation();

      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (practiceMode === "dictation") {
        if (e.key === "r" || e.key === "R" || e.key === " " || e.code === "Space") {
          e.preventDefault();
          onDictationPlay();
        } else if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          onCapture(sentenceId);
        }
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (mode === "idle") {
          onStartFlow();
        } else {
          onStopAll();
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onPlayOriginal();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        onSetActiveTool(activeTool === "stress" ? null : "stress");
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        const copiedMsg = copyToasts?.copied ?? "Copied to clipboard";
        const failedMsg = copyToasts?.failed ?? "Failed to copy";
        (async () => {
          try {
            const { toast } = await import("sonner");
            await navigator.clipboard.writeText(sentenceText);
            toast.success(copiedMsg);
          } catch {
            const { toast } = await import("sonner");
            toast.error(failedMsg);
          }
        })();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        onCapture(sentenceId);
      }
    },
    [
      practiceMode,
      isEditingText,
      mode,
      activeTool,
      sentenceId,
      onEscape,
      onPrev,
      onNext,
      onStartFlow,
      onStopAll,
      onPlayOriginal,
      onSetActiveTool,
      onCapture,
      onDictationPlay,
      onDictationSubmit,
      sentenceText,
      copyToasts,
    ]
  );
}
