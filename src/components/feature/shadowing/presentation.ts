import type { DictationComparison } from "./dictation";

export type ShadowingWorkflowMode =
  | "idle"
  | "playing_original"
  | "recording"
  | "reviewing";

export type ShadowingPracticeMode = "shadowing" | "dictation";

interface DictationSubmitShortcutLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
}

interface ShadowingSentenceLike {
  id?: string;
  startTime: number;
  endTime: number;
  text?: string;
  formatting?: string | null;
  reviewItem?: unknown;
}

interface ShadowingOriginalAudioState<T> {
  sliceKey: string;
  blob: T | null;
}

export interface DictationDraftState {
  sentenceKey: string;
  answer: string;
  result: DictationComparison | null;
  replayCount: number;
  hasPlayedOnce: boolean;
}

export function getShadowingOverlayClassName() {
  return "fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 outline-none";
}

export function shouldRenderOriginalWavePlayer(
  mode: ShadowingWorkflowMode,
  hasOriginalBlob: boolean
) {
  return hasOriginalBlob && ["idle", "playing_original", "recording", "reviewing"].includes(mode);
}

export function shouldRenderBackgroundAudioPlayer(shadowingMode: boolean) {
  return !shadowingMode;
}

export function shouldRenderTrackNotes(shadowingMode?: boolean) {
  void shadowingMode;
  return true;
}

export function getShadowingAudioSliceKey(sentence: ShadowingSentenceLike) {
  return `${sentence.id ?? "unknown"}:${sentence.startTime}:${sentence.endTime}`;
}

export function getInitialDictationDraftState(
  sentence: ShadowingSentenceLike
): DictationDraftState {
  return {
    sentenceKey: getShadowingAudioSliceKey(sentence),
    answer: "",
    result: null,
    replayCount: 0,
    hasPlayedOnce: false,
  };
}

export function getDictationDraftStateForSentence(
  state: DictationDraftState,
  sentence: ShadowingSentenceLike
) {
  const nextKey = getShadowingAudioSliceKey(sentence);

  if (state.sentenceKey === nextKey) {
    return state;
  }

  return getInitialDictationDraftState(sentence);
}

export function shouldShowDictationResult(
  result: DictationComparison | null
) {
  return result !== null;
}

export function shouldEnableDictationResultPlayback(
  result: DictationComparison | null,
  isAudioReady: boolean
) {
  return result !== null && isAudioReady;
}

export function shouldShowDictationOriginalCopyButton(
  result: DictationComparison | null
) {
  return result !== null;
}

export function getPracticeModeButtonClassName(
  mode: ShadowingPracticeMode,
  activeMode: ShadowingPracticeMode
) {
  if (mode === activeMode) {
    return mode === "shadowing"
      ? "h-9 gap-1.5 px-4 bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary hover:text-white"
      : "h-9 gap-1.5 px-4 bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:text-white";
  }

  return "h-9 gap-1.5 px-4 bg-background text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground";
}

export function isDictationSubmitShortcut(event: DictationSubmitShortcutLike) {
  return event.key === "Enter" && (event.metaKey === true || event.ctrlKey === true);
}

export function getDisplayedShadowingOriginalAudio<T>(
  state: ShadowingOriginalAudioState<T>,
  activeSliceKey: string
) {
  return {
    blob: state.blob,
    isReady: state.sliceKey === activeSliceKey,
  };
}
