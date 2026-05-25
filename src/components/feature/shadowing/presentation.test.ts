import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getShadowingOverlayClassName,
  shouldRenderOriginalWavePlayer,
  shouldRenderBackgroundAudioPlayer,
  shouldRenderTrackNotes,
  getShadowingAudioSliceKey,
  getDisplayedShadowingOriginalAudio,
  getInitialDictationDraftState,
  getDictationDraftStateForSentence,
  shouldShowDictationResult,
  getPracticeModeButtonClassName,
  isDictationSubmitShortcut,
  shouldEnableDictationResultPlayback,
  shouldShowDictationOriginalCopyButton,
} from "./presentation";

test("shadowing overlay avoids backdrop blur to reduce full-screen repainting", () => {
  assert.equal(
    getShadowingOverlayClassName(),
    "fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 outline-none"
  );
});

test("original waveform stays mounted through review mode transitions", () => {
  assert.equal(shouldRenderOriginalWavePlayer("idle", true), true);
  assert.equal(shouldRenderOriginalWavePlayer("playing_original", true), true);
  assert.equal(shouldRenderOriginalWavePlayer("recording", true), true);
  assert.equal(shouldRenderOriginalWavePlayer("reviewing", true), true);
  assert.equal(shouldRenderOriginalWavePlayer("reviewing", false), false);
});

test("background audio player is hidden while shadowing is open", () => {
  assert.equal(shouldRenderBackgroundAudioPlayer(false), true);
  assert.equal(shouldRenderBackgroundAudioPlayer(true), false);
});

test("track notes stay mounted during shadowing so F1-F4 shortcuts keep working", () => {
  assert.equal(shouldRenderTrackNotes(false), true);
  assert.equal(shouldRenderTrackNotes(true), true);
});

test("track notes helper accepts the shadowing mode flag from practice client", () => {
  const source = readFileSync(new URL("./presentation.ts", import.meta.url), "utf8");

  assert.match(source, /export function shouldRenderTrackNotes\([^)]*shadowingMode\?: boolean[^)]*\)/);
});

test("audio slice key only changes when the sentence timing changes", () => {
  assert.equal(
    getShadowingAudioSliceKey({
      id: "sentence-1",
      text: "First wording",
      startTime: 10,
      endTime: 12.5,
      formatting: "{\"stress\":[1]}",
    }),
    getShadowingAudioSliceKey({
      id: "sentence-1",
      text: "Updated wording",
      startTime: 10,
      endTime: 12.5,
      reviewItem: { note: "new review state" },
    })
  );

  assert.notEqual(
    getShadowingAudioSliceKey({
      id: "sentence-1",
      text: "Updated wording",
      startTime: 10,
      endTime: 12.5,
    }),
    getShadowingAudioSliceKey({
      id: "sentence-1",
      text: "Updated wording",
      startTime: 10,
      endTime: 12.8,
    })
  );
});

test("previous original waveform stays visible while the next slice is preparing", () => {
  assert.deepEqual(
    getDisplayedShadowingOriginalAudio(
      {
        sliceKey: "sentence-1:0:1",
        blob: "blob-a",
      },
      "sentence-2:1:2"
    ),
    {
      blob: "blob-a",
      isReady: false,
    }
  );
});

test("current original waveform is marked ready once the active slice finishes preparing", () => {
  assert.deepEqual(
    getDisplayedShadowingOriginalAudio(
      {
        sliceKey: "sentence-2:1:2",
        blob: "blob-b",
      },
      "sentence-2:1:2"
    ),
    {
      blob: "blob-b",
      isReady: true,
    }
  );
});

test("original waveform player is not keyed by sentence id during sentence switches", () => {
  const source = readFileSync(new URL("../ShadowingConsole.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /key=\{sentence\.id \+ "-original"\}/);
});

test("dictation draft resets when the sentence slice changes", () => {
  const firstSentence = { id: "sentence-1", startTime: 0, endTime: 2 };
  const nextSentence = { id: "sentence-2", startTime: 2, endTime: 4 };
  const dirtyDraft = {
    ...getInitialDictationDraftState(firstSentence),
    answer: "partially remembered text",
    replayCount: 2,
    hasPlayedOnce: true,
    result: {
      accuracy: 50,
      isExactAfterNormalization: false,
      missingWords: ["text"],
      extraWords: [],
      wordDiff: [],
    },
  };

  assert.deepEqual(
    getDictationDraftStateForSentence(dirtyDraft, nextSentence),
    getInitialDictationDraftState(nextSentence)
  );
});

test("dictation result visibility follows result state", () => {
  assert.equal(shouldShowDictationResult(null), false);
  assert.equal(
    shouldShowDictationResult({
      accuracy: 100,
      isExactAfterNormalization: true,
      missingWords: [],
      extraWords: [],
      wordDiff: [],
    }),
    true
  );
});

test("practice mode buttons expose a prominent active state", () => {
  assert.match(
    getPracticeModeButtonClassName("shadowing", "shadowing"),
    /bg-indigo-600/
  );
  assert.match(
    getPracticeModeButtonClassName("dictation", "dictation"),
    /bg-emerald-600/
  );
  assert.match(
    getPracticeModeButtonClassName("shadowing", "dictation"),
    /bg-white/
  );
});

test("dictation submit shortcut accepts cmd enter and ctrl enter", () => {
  assert.equal(
    isDictationSubmitShortcut({ key: "Enter", metaKey: true, ctrlKey: false }),
    true
  );
  assert.equal(
    isDictationSubmitShortcut({ key: "Enter", metaKey: false, ctrlKey: true }),
    true
  );
  assert.equal(
    isDictationSubmitShortcut({ key: "Enter", metaKey: false, ctrlKey: false }),
    false
  );
});

test("dictation result playback is enabled only after result and audio are ready", () => {
  const result = {
    accuracy: 100,
    isExactAfterNormalization: true,
    missingWords: [],
    extraWords: [],
    wordDiff: [],
  };

  assert.equal(shouldEnableDictationResultPlayback(result, true), true);
  assert.equal(shouldEnableDictationResultPlayback(result, false), false);
  assert.equal(shouldEnableDictationResultPlayback(null, true), false);
});

test("dictation original copy button appears only after result is shown", () => {
  const result = {
    accuracy: 80,
    isExactAfterNormalization: false,
    missingWords: ["word"],
    extraWords: [],
    wordDiff: [],
  };

  assert.equal(shouldShowDictationOriginalCopyButton(result), true);
  assert.equal(shouldShowDictationOriginalCopyButton(null), false);
});
