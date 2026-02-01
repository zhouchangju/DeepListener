# Shadowing Experience Upgrade Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Comprehensively upgrade the Shadowing interface with keyboard focus management, audio region looping, text editing, note integration, and bug fixes.

**Architecture:**
- **Focus:** Implement a global event listener in `ShadowingConsole` that stops propagation to the parent.
- **Regions:** Enhance `MiniWavePlayer` with `wavesurfer.js` Regions plugin.
- **Editing:** Add an "Edit Text" mode to `ShadowingConsole` that updates the backend and clears formatting.
- **Notes:** Integrate `DiagnosisModal` into `ShadowingConsole` header.
- **Selection:** conditionally enable `pointer-events` in `InteractiveText` based on active tool.

**Tech Stack:** Next.js 15, Wavesurfer.js, React Hooks.

---

### Task 1: Focus Trap & Keyboard Management

**Files:**
- Modify: `src/components/feature/ShadowingConsole.tsx`
- Modify: `src/components/feature/audio-player/useAudioInteractions.ts` (Check for conflict)

**Step 1: Implement Focus Trap Hook**
- In `src/components/feature/ShadowingConsole.tsx`, add a `useEffect` that:
    1. Focuses the console container on mount.
    2. Intercepts `Space` key.
    3. Calls `startFlow` (Play) or `stopAll` (Pause) based on state.
    4. Prevents default and stops propagation to avoid triggering the background player.

**Step 2: Update AudioPlayer Interactions**
- Ensure the background `AudioPlayer` checks if a modal is open or if `document.activeElement` is within the player before responding to global keys. (Might not be needed if `stopPropagation` works, but good for robustness).

**Step 3: Commit**
```bash
git add src/components/feature/ShadowingConsole.tsx
git commit -m "feat: implement focus trap for shadowing console"
```

---

### Task 2: Audio Region Looping (MiniWavePlayer Upgrade)

**Files:**
- Modify: `src/components/feature/MiniWavePlayer.tsx`

**Step 1: Import Regions Plugin**
- Import `RegionsPlugin` from `wavesurfer.js/dist/plugins/regions.esm.js`.

**Step 2: Initialize Regions**
- Update `MiniWavePlayer` to register the plugin.
- Add `enableRegions` prop (default `false`).
- In `ShadowingConsole`, pass `enableRegions={true}` for the **Original** audio player only.

**Step 3: Implement Loop Logic**
- Add listener `regions.on('region-created', ...)`:
    - Clear previous regions (only allow one loop region).
    - Loop the region immediately on play.
    - Add listener `region-out` to loop back to start.

**Step 4: Cleanup**
- Ensure regions are destroyed on unmount.

**Step 5: Commit**
```bash
git add src/components/feature/MiniWavePlayer.tsx src/components/feature/ShadowingConsole.tsx
git commit -m "feat: add region looping support to MiniWavePlayer"
```

---

### Task 3: Text Selection & Edit Mode (InteractiveText Upgrade)

**Files:**
- Modify: `src/components/feature/notation/InteractiveText.tsx`
- Modify: `src/components/feature/ShadowingConsole.tsx`
- Modify: `src/app/api/sentence/[id]/route.ts` (Update to handle text change)

**Step 1: Select Mode**
- In `InteractiveText.tsx`:
    - When `activeTool === null`, remove `onClick` handlers from tokens.
    - Set `user-select: text` (via Tailwind `select-text`) on the container.
    - When `activeTool !== null`, set `select-none`.

**Step 2: Edit Text Logic**
- In `ShadowingConsole.tsx`:
    - Add "Edit Text" button (Pencil icon) next to the text.
    - When clicked, swap `InteractiveText` with a `Textarea`.
    - "Save" button calls API `PATCH /sentence/:id` with new `text` AND `formatting: null`.
    - Update local state `sentence.text` and `localFormatting`.

**Step 3: Update API**
- Verify `src/app/api/sentence/[id]/route.ts` handles `text` update. If not, add it.

**Step 4: Commit**
```bash
git add src/components/feature/notation/InteractiveText.tsx src/components/feature/ShadowingConsole.tsx src/app/api/sentence/[id]/route.ts
git commit -m "feat: enable text selection and editing in shadowing mode"
```

---

### Task 4: Note Integration (Vault)

**Files:**
- Modify: `src/components/feature/ShadowingConsole.tsx`
- Modify: `src/app/practice/[id]/PracticeClient.tsx` (Pass saved status?)

**Step 1: Check Saved Status**
- The `sentence` prop in `ShadowingConsole` needs to know if it's already in the vault.
- Update `ShadowingConsoleProps` to include `reviewItem?: any`.
- Pass this from `PracticeClient`.

**Step 2: Add Bookmark Button**
- In `ShadowingConsole` header:
    - Add `Bookmark` button.
    - Color it amber if `reviewItem` exists.

**Step 3: Integration DiagnosisModal**
- Render `DiagnosisModal` inside `ShadowingConsole` (or controlled by it).
- When Bookmark clicked -> Open Modal.
- On Save -> Refresh data (via `router.refresh()` or callback).

**Step 4: Commit**
```bash
git add src/components/feature/ShadowingConsole.tsx src/app/practice/[id]/PracticeClient.tsx
git commit -m "feat: integrate note taking into shadowing console"
```

---

### Task 5: Bug Fixes (Rec Again & Player Control)

**Files:**
- Modify: `src/components/feature/MiniWavePlayer.tsx`
- Modify: `src/components/feature/shadowing/useShadowingWorkflow.ts`

**Step 1: Fix MiniWavePlayer Pause**
- The user reported "left play button cannot pause recording audio".
- Check `MiniWavePlayer`'s `togglePlay`. It calls `wavesurferRef.current?.playPause()`.
- Ensure `wavesurfer` instance is valid and state is synced.

**Step 2: Fix Rec Again Race Condition**
- Review `useShadowingWorkflow.ts`.
- In `handleRecAgain`:
    - It calls `stopAll()`.
    - Then sets `abortedRef.current = false`.
    - Then starts recording.
- Potential issue: `stopAll` is async in effect? No.
- But `mediaRecorder` stop is async.
- Add a small delay or await state stability?
- Better: Ensure `stopAll` fully resets the `userBlob` state instantly.

**Step 3: Commit**
```bash
git add src/components/feature/MiniWavePlayer.tsx src/components/feature/shadowing/useShadowingWorkflow.ts
git commit -m "fix: shadowing player pause and rec-again race condition"
```
