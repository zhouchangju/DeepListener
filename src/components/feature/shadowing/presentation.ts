export type ShadowingWorkflowMode =
  | "idle"
  | "playing_original"
  | "recording"
  | "reviewing";

interface ShadowingSentenceLike {
  id?: string;
  startTime: number;
  endTime: number;
}

interface ShadowingOriginalAudioState<T> {
  sliceKey: string;
  blob: T | null;
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

export function getDisplayedShadowingOriginalAudio<T>(
  state: ShadowingOriginalAudioState<T>,
  activeSliceKey: string
) {
  return {
    blob: state.blob,
    isReady: state.sliceKey === activeSliceKey,
  };
}
