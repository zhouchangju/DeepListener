# Video Subtitle Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a video-only, sentence-aligned subtitle bar that is hidden by default and can be toggled without persisting the preference.

**Architecture:** A pure timing helper selects the active normalized sentence from the shared video clock. A focused `VideoSubtitleBar` renders the toggle and two-line subtitle surface. `AudioPlayer` owns visibility state and forwards its existing WaveSurfer/video time updates; no database or API changes are needed.

**Tech Stack:** React 19, TypeScript, WaveSurfer.js, Tailwind CSS, Node test runner

## Global Constraints

- Render subtitles outside the video frame, between video and existing player controls.
- Render the feature only when `videoUrl` exists.
- Initialize subtitles as hidden on every mount; do not use localStorage or Prisma.
- Prefer the later sentence at a shared boundary and render nothing in genuine gaps.
- Reuse normalized sentence timings and the existing shared playback clock.
- Do not change Shadowing, Vault, Review, upload, transcription, exports, or media persistence.

---

## File Structure

- Create `src/components/feature/video-subtitles/presentation.ts`: pure active-subtitle matching.
- Create `src/components/feature/video-subtitles/presentation.test.ts`: timing boundary and malformed-input tests.
- Create `src/components/feature/video-subtitles/VideoSubtitleBar.tsx`: video-only toggle and subtitle surface.
- Create `src/components/feature/video-subtitles/VideoSubtitleBar.test.ts`: source-level component contract tests.
- Modify `src/components/feature/AudioPlayer.tsx`: own subtitle state and feed it from the shared clock.
- Modify `src/components/feature/video-player.structure.test.ts`: integration structure and non-persistence checks.
- Modify current product docs and changelog after behavior is verified.

### Task 1: Active subtitle timing helper

**Files:**
- Create: `src/components/feature/video-subtitles/presentation.ts`
- Test: `src/components/feature/video-subtitles/presentation.test.ts`

**Interfaces:**
- Consumes: `SubtitleSentence[]` with `text`, `startTime`, and `endTime`.
- Produces: `getActiveSubtitle(sentences: SubtitleSentence[], currentTime: number): string | null`.

- [ ] **Step 1: Write failing timing tests**

Cover exact starts/ends, later-sentence preference at shared boundaries, gaps, out-of-range time, and invalid numeric timing:

```ts
assert.equal(getActiveSubtitle(sentences, 1), "Second");
assert.equal(getActiveSubtitle(sentencesWithGap, 1.5), null);
assert.equal(getActiveSubtitle(sentences, Number.NaN), null);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --import tsx --test src/components/feature/video-subtitles/presentation.test.ts
```

Expected: failure because `presentation.ts` or `getActiveSubtitle` does not exist.

- [ ] **Step 3: Implement minimal reverse-order matcher**

```ts
export function getActiveSubtitle(sentences: SubtitleSentence[], currentTime: number) {
  if (!Number.isFinite(currentTime)) return null;
  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    const sentence = sentences[index];
    if (!Number.isFinite(sentence.startTime) || !Number.isFinite(sentence.endTime)) continue;
    if (currentTime >= sentence.startTime && currentTime <= sentence.endTime) return sentence.text;
  }
  return null;
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Expected: all timing tests pass.

### Task 2: Video subtitle bar component

**Files:**
- Create: `src/components/feature/video-subtitles/VideoSubtitleBar.tsx`
- Test: `src/components/feature/video-subtitles/VideoSubtitleBar.test.ts`

**Interfaces:**
- Consumes: `{ visible: boolean; subtitle: string | null; onVisibleChange: (visible: boolean) => void }`.
- Produces: keyboard-accessible `Show subtitles` / `Hide subtitles` control and optional `aria-live="off"` subtitle surface.

- [ ] **Step 1: Write failing component contract tests**

Assert the component uses the shared Button primitive, exposes both accessible labels, renders the subtitle only while visible, and uses a bounded two-line class:

```ts
assert.match(source, /visible \? "Hide subtitles" : "Show subtitles"/);
assert.match(source, /aria-live="off"/);
assert.match(source, /line-clamp-2/);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --import tsx --test src/components/feature/video-subtitles/VideoSubtitleBar.test.ts
```

Expected: failure because `VideoSubtitleBar.tsx` does not exist.

- [ ] **Step 3: Implement the focused component**

Use an outside-video dark surface, a compact toggle row, centered two-line text, and no click behavior on subtitle text. Do not read media, storage, or database state inside this component.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: all component contract tests pass.

### Task 3: Shared-clock integration and verification

**Files:**
- Modify: `src/components/feature/AudioPlayer.tsx`
- Modify: `src/components/feature/video-player.structure.test.ts`
- Modify: `docs/requirement.md`
- Modify: `docs/architecture.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `getActiveSubtitle`, `VideoSubtitleBar`, normalized `sentences`, and existing `onTimeUpdate(time)`.
- Produces: video-only subtitle UI synchronized to every media time update.

- [ ] **Step 1: Write failing integration assertions**

Assert `AudioPlayer` initializes `subtitlesVisible` to false, renders `VideoSubtitleBar` only inside the `videoUrl` branch, calls `getActiveSubtitle(sentences, time)` from the existing time callback, and contains no localStorage/API persistence.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --import tsx --test src/components/feature/video-player.structure.test.ts
```

Expected: failure because subtitle integration is absent.

- [ ] **Step 3: Implement shared-clock integration**

Add local state:

```ts
const [subtitlesVisible, setSubtitlesVisible] = useState(false);
const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
```

Inside the existing WaveSurfer time callback, update `activeSubtitle` from normalized sentences. Render `VideoSubtitleBar` directly after `<video>` and only when `videoUrl` exists.

- [ ] **Step 4: Run targeted tests**

Run all subtitle and video-player test files. Expected: zero failures.

- [ ] **Step 5: Run browser acceptance**

With the existing real video Track, verify:

- subtitles are hidden on initial load;
- `Show subtitles` reveals the current sentence;
- playback/seek changes the displayed sentence;
- `Hide subtitles` removes the subtitle surface;
- reloading resets the control to hidden;
- audio-only Practice has no subtitle control;
- browser console has no new errors.

- [ ] **Step 6: Update current documentation**

Document the default-off video subtitle bar, the shared-clock timing behavior, and the lack of persistence/customization.

- [ ] **Step 7: Run complete gates**

```bash
npm run lint
npm run build
node --import tsx --test src/components/feature/video-subtitles/presentation.test.ts src/components/feature/video-subtitles/VideoSubtitleBar.test.ts src/components/feature/video-player.structure.test.ts
npm run test:ci
```

Expected: every command exits zero.

- [ ] **Step 8: Commit semantic batches**

```bash
git commit -m "feat: add optional video subtitle bar"
git commit -m "docs: document video subtitle controls"
```
