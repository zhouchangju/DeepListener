# Vault Track Filter, Play All & Export Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add track-filtered vault views, sequential Play All with sticky bar, and difficulty/track-filtered audio export.

**Architecture:** Client-side URL param filtering in VaultListClient (useSearchParams), sequential audio playback via state machine in existing audio ref, new `'filtered'` export API type. All changes are additive — no existing functionality modified.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Prisma (SQLite), lucide-react, sonner (toast)

**Design doc:** `docs/plans/2026-03-06-vault-track-filter-and-playall-design.md`

---

### Task 1: API — Add `'filtered'` export type with difficulty + track filters

**Files:**
- Modify: `src/app/api/audio/export/route.ts`

**Step 1: Read the current export route**

Read `src/app/api/audio/export/route.ts` to understand the `gatherSegments` function and existing types.

**Step 2: Add the `'filtered'` case to `gatherSegments`**

In `gatherSegments`, the function signature currently is:
```ts
async function gatherSegments(type: 'all' | 'due' | 'track', trackId?: string)
```

Change the signature and add the new case:

```ts
async function gatherSegments(
  type: 'all' | 'due' | 'track' | 'filtered',
  trackId?: string,
  difficulties?: string[],
  trackIds?: string[]
): Promise<AudioSegment[]>
```

Add after the `'track'` case (before `default`):

```ts
case 'filtered':
  reviewItems = await prisma.reviewItem.findMany({
    where: {
      isArchived: false,
      ...(difficulties && difficulties.length > 0 && { difficulty: { in: difficulties } }),
      ...(trackIds && trackIds.length > 0 && { sentence: { trackId: { in: trackIds } } }),
    },
    include: {
      sentence: {
        include: { track: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  break;
```

**Step 3: Update the POST handler to parse and pass new params**

In the `POST` handler, change the body parsing from:
```ts
const { type, trackId }: { type: 'all' | 'due' | 'track'; trackId?: string } = body;
```
To:
```ts
const { type, trackId, difficulties, trackIds }: {
  type: 'all' | 'due' | 'track' | 'filtered';
  trackId?: string;
  difficulties?: string[];
  trackIds?: string[];
} = body;
```

Update the validation block to also allow `'filtered'`:
```ts
if (type !== 'all' && type !== 'due' && type !== 'track' && type !== 'filtered') {
```

Update the `gatherSegments` call:
```ts
const segments = await gatherSegments(type, trackId, difficulties, trackIds);
```

**Step 4: Update the filename generator for filtered exports**

After `generateFilename`, update the call site for filtered type. In the response at the bottom:
```ts
const filename = type === 'filtered'
  ? `DeepListener_Filtered_${new Date().toISOString().split('T')[0]}.mp3`
  : generateFilename();
```

**Step 5: Manual test**

Start dev server: `npm run dev`
Use browser devtools console on the vault page:
```js
fetch('/api/audio/export', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ type: 'filtered', difficulties: ['HARD', 'VERY_HARD'] })
}).then(r => console.log(r.status, r.headers.get('Content-Disposition')))
```
Expected: 200 with filename header, or 400 "No sentences to export" if no hard items.

**Step 6: Commit**
```bash
git add src/app/api/audio/export/route.ts
git commit -m "feat: add filtered export type with difficulty and trackIds params"
```

---

### Task 2: Library page — Add "View Notes" to track card dropdown

**Files:**
- Modify: `src/app/library/TrackList.tsx`

**Step 1: Add the import**

At the top of `TrackList.tsx`, add `BookMarked` to the lucide-react import (it's already imported, check existing icons and add `BookMarked` or use `BookOpen` which is already imported):

The file already imports `BookOpen`. Use that.

**Step 2: Add "View Notes" DropdownMenuItem**

In the `DropdownMenuContent`, add a new item before the separator line (`<div className="h-px bg-border my-1" />`):

```tsx
<DropdownMenuItem
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/vault?trackId=${track.id}`);
  }}
>
  <BookOpen className="mr-2 h-4 w-4" /> View Notes
</DropdownMenuItem>
```

Place it right before the separator, after the status change items section.

**Step 3: Manual test**

Visit `/library`. Hover a track card, click the `⋮` menu. Verify "View Notes" appears. Click it — should navigate to `/vault?trackId=<id>`.

**Step 4: Commit**
```bash
git add src/app/library/TrackList.tsx
git commit -m "feat: add View Notes link to track card dropdown menu"
```

---

### Task 3: Practice page — Add "View Notes" link in header

**Files:**
- Modify: `src/app/practice/[id]/page.tsx`

**Step 1: Add Link import**

The file already imports from Next.js. Add `Link` if not present (check current imports).

**Step 2: Add the "View Notes" badge**

In `PracticePage`, change the header section from:
```tsx
<h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-4 break-words leading-tight">
  {track.title}
</h1>
```

To:
```tsx
<div className="flex items-center justify-between mb-4 sm:mb-6 px-4">
  <h1 className="text-xl sm:text-2xl font-bold break-words leading-tight">
    {track.title}
  </h1>
  <Link
    href={`/vault?trackId=${id}`}
    className="flex-shrink-0 ml-4 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors"
  >
    View Notes
  </Link>
</div>
```

**Step 3: Manual test**

Visit a practice page `/practice/<id>`. Verify "View Notes" appears in top right of header. Click — should navigate to `/vault?trackId=<id>`.

**Step 4: Commit**
```bash
git add src/app/practice/[id]/page.tsx
git commit -m "feat: add View Notes link to practice page header"
```

---

### Task 4: Vault — URL-based track filtering in VaultListClient

**Files:**
- Modify: `src/app/vault/VaultListClient.tsx`

**Step 1: Add useSearchParams and router**

At the top of the component, the file already imports `useRouter`. Add `useSearchParams` and `useCallback`:
```tsx
import { useState, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
```

**Step 2: Read trackId from URL in the component body**

After existing state declarations, add:
```tsx
const searchParams = useSearchParams();
const initialTrackId = searchParams.get('trackId');
```

**Step 3: Find the track name for display**

```tsx
const activeTrackName = useMemo(() => {
  if (!initialTrackId) return null;
  const item = initialItems.find(i => i.sentence.track.id === initialTrackId);
  return item?.sentence.track.title ?? null;
}, [initialTrackId, initialItems]);
```

**Step 4: Add trackId filter to filteredItems useMemo**

In the existing `filteredItems` useMemo, add as the first filter check (before `showArchived` check):
```ts
if (initialTrackId && item.sentence.track.id !== initialTrackId) return false;
```

Full updated filter start:
```ts
const filteredItems = useMemo(() => {
  const filtered = initialItems.filter((item) => {
    if (initialTrackId && item.sentence.track.id !== initialTrackId) return false;
    if (!showArchived && item.isArchived) return false;
    // ... rest unchanged
  });
  // ... sort unchanged
}, [initialItems, showArchived, selectedDifficulties, selectedTags, searchQuery, sortBy, initialTrackId]);
```

**Step 5: Add track filter pill to the UI**

In the JSX, between the archive toggle div and the advanced filters div, add:
```tsx
{activeTrackName && (
  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
    <span className="text-sm text-indigo-700">
      Filtered by track: <strong>{activeTrackName}</strong>
    </span>
    <button
      onClick={() => router.push('/vault')}
      className="ml-auto text-indigo-400 hover:text-indigo-700 transition-colors"
      title="Clear track filter"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)}
```

**Step 6: Manual test**

1. Visit `/vault` — no track pill should appear
2. Click "View Notes" from library or practice page
3. Vault should show the pill "Filtered by track: Track Title [×]"
4. Only that track's vault items should appear
5. Click × — should go back to `/vault` showing all items

**Step 7: Commit**
```bash
git add src/app/vault/VaultListClient.tsx
git commit -m "feat: add URL-based track filter to vault page"
```

---

### Task 5: Vault — Play All with sticky floating bar

**Files:**
- Modify: `src/app/vault/VaultListClient.tsx`

**Step 1: Add Play All state**

After existing state declarations:
```tsx
const [playAllActive, setPlayAllActive] = useState(false);
const [playAllIndex, setPlayAllIndex] = useState(0);
const [playAllPaused, setPlayAllPaused] = useState(false);
const playAllIndexRef = useRef(0); // ref for use inside timer callbacks
```

**Step 2: Add playAllIndexRef sync**

After the state declarations:
```tsx
// Keep ref in sync for use inside setTimeout callbacks
playAllIndexRef.current = playAllIndex;
```

**Step 3: Add Play All control functions**

After the existing `playAudio` function, add:

```tsx
const stopPlayAll = useCallback(() => {
  const audio = audioRef.current;
  if (audio) {
    const audioWithTimer = audio as HTMLAudioElement & { activeTimer?: ReturnType<typeof setTimeout> };
    if (audioWithTimer.activeTimer) clearTimeout(audioWithTimer.activeTimer);
    audio.pause();
  }
  setPlayAllActive(false);
  setPlayAllPaused(false);
  setPlayAllIndex(0);
  setPlayingId(null);
}, []);

const playItemAtIndex = useCallback((index: number, items: typeof filteredItems) => {
  if (index >= items.length) {
    stopPlayAll();
    toast.success(`Finished playing ${items.length} sentences`);
    return;
  }

  const item = items[index];
  if (!audioRef.current) {
    audioRef.current = new Audio();
  }
  const audio = audioRef.current;
  const audioWithTimer = audio as HTMLAudioElement & { activeTimer?: ReturnType<typeof setTimeout> };

  if (audioWithTimer.activeTimer) clearTimeout(audioWithTimer.activeTimer);

  audio.src = item.sentence.track.audioUrl;
  audio.currentTime = item.sentence.startTime;
  audio.play();
  setPlayingId(item.id);
  setPlayAllIndex(index);
  playAllIndexRef.current = index;

  const duration = (item.sentence.endTime - item.sentence.startTime) * 1000;
  audioWithTimer.activeTimer = setTimeout(() => {
    playItemAtIndex(playAllIndexRef.current + 1, items);
  }, duration);
}, [stopPlayAll]);

const startPlayAll = useCallback(() => {
  if (filteredItems.length === 0) return;
  setPlayAllActive(true);
  setPlayAllPaused(false);
  playItemAtIndex(0, filteredItems);
}, [filteredItems, playItemAtIndex]);

const pausePlayAll = useCallback(() => {
  const audio = audioRef.current;
  if (!audio) return;
  const audioWithTimer = audio as HTMLAudioElement & { activeTimer?: ReturnType<typeof setTimeout> };
  if (audioWithTimer.activeTimer) clearTimeout(audioWithTimer.activeTimer);
  audio.pause();
  setPlayAllPaused(true);
}, []);

const resumePlayAll = useCallback(() => {
  setPlayAllPaused(false);
  playItemAtIndex(playAllIndexRef.current, filteredItems);
}, [filteredItems, playItemAtIndex]);

const nextInPlayAll = useCallback(() => {
  playItemAtIndex(playAllIndexRef.current + 1, filteredItems);
}, [filteredItems, playItemAtIndex]);
```

**Step 4: Update `playAudio` to cancel Play All mode**

At the start of the existing `playAudio` function, add:
```tsx
const playAudio = (item: VaultItem) => {
  // Cancel play-all mode when user manually plays an item
  if (playAllActive) {
    stopPlayAll();
  }
  // ... rest of existing function unchanged
```

**Step 5: Add "Play All" button to the top controls area**

In the JSX, find the archive toggle div (the first div in the `space-y-4`). Add a "Play All" button on the right side of that div:

Change the archive toggle div from:
```tsx
<div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg border">
  <div className="flex items-center gap-2">
    ...
  </div>
  <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
    ...
  </Button>
</div>
```

To:
```tsx
<div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg border">
  <div className="flex items-center gap-2">
    {showArchived ? (
      <ArchiveRestore className="w-4 h-4 text-gray-600" />
    ) : (
      <Archive className="w-4 h-4 text-gray-600" />
    )}
    <span className="text-sm text-gray-600">
      {showArchived ? 'Showing Archived Notes' : 'Showing Active Notes'}
    </span>
  </div>
  <div className="flex items-center gap-2">
    <Button
      variant={playAllActive ? "default" : "outline"}
      size="sm"
      onClick={playAllActive ? stopPlayAll : startPlayAll}
      disabled={filteredItems.length === 0}
      className="flex items-center gap-1.5"
    >
      <Play className="w-4 h-4" />
      {playAllActive ? 'Stop' : `Play All (${filteredItems.length})`}
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowArchived(!showArchived)}
    >
      {showArchived ? 'Show Active' : 'Show Archived'}
    </Button>
  </div>
</div>
```

**Step 6: Add sticky floating bar at bottom of the component**

At the very end of the returned JSX (before the closing `</div>` of `space-y-4`), add:

```tsx
{/* Sticky Play All bar */}
{playAllActive && (
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg px-4 py-3">
    <div className="container mx-auto flex items-center gap-4">
      <span className="text-sm font-medium text-gray-500 flex-shrink-0">
        {playAllIndex + 1} / {filteredItems.length}
      </span>
      <div className="flex-grow min-w-0">
        {filteredItems[playAllIndex] && (
          <>
            <p className="text-xs text-gray-400 truncate">
              {filteredItems[playAllIndex].sentence.track.title}
            </p>
            <p className="text-sm font-medium text-gray-800 truncate">
              {filteredItems[playAllIndex].sentence.text}
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {playAllPaused ? (
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={resumePlayAll}>
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={pausePlayAll}>
            <span className="text-xs font-bold">⏸</span>
          </Button>
        )}
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={nextInPlayAll}
          disabled={playAllIndex >= filteredItems.length - 1}>
          <span className="text-xs font-bold">⏭</span>
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={stopPlayAll}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
)}
```

**Step 7: Add bottom padding when bar is active**

Wrap the outer `<div className="space-y-4">` to add padding when bar is active:
```tsx
<div className={`space-y-4 ${playAllActive ? 'pb-20' : ''}`}>
```

**Step 8: Add missing lucide icons**

Ensure `Pause` or use text. Check that `Play` is already imported (it is). Add `SkipForward` if desired, or use the text ⏭ approach shown above.

**Step 9: Manual test**

1. Visit `/vault`, click "Play All (N)" — should start playing first item, sticky bar appears at bottom
2. Verify bar shows "1 / N", track name, sentence text
3. Let it auto-advance to sentence 2 — bar updates
4. Click ⏸ — audio pauses, timer cleared
5. Click ▶ — resumes from same sentence
6. Click ⏭ — skips to next
7. Click ✕ — stops, bar disappears
8. Filter to HARD difficulty, click Play All — only hard items play
9. At last sentence, finishes with toast

**Step 10: Commit**
```bash
git add src/app/vault/VaultListClient.tsx
git commit -m "feat: add Play All sequential playback with sticky floating bar"
```

---

### Task 6: Vault — ExportButtons with difficulty + track filters

**Files:**
- Modify: `src/app/vault/ExportButtons.tsx`
- Modify: `src/app/vault/page.tsx`

**Step 1: Update page.tsx to extract unique tracks and pass items**

In `VaultContent()` in `page.tsx`, after fetching `items`, pass them to ExportButtons:

```tsx
const uniqueTracks = [...new Map(
  items.map(i => [i.sentence.track.id, i.sentence.track])
).values()];

return (
  <>
    <ExportButtons
      items={items as any}
      availableTracks={uniqueTracks}
      dueCount={dueCount}
    />
    <VaultListClient initialItems={items as any} totalCount={totalCount} />
  </>
);
```

Remove `itemCount={items.length}` (we'll calculate from items directly in ExportButtons).

**Step 2: Update ExportButtons props**

Replace the current props interface:
```tsx
interface Track {
  id: string;
  title: string;
}

interface VaultItemForExport {
  difficulty?: string;
  sentence: {
    track: { id: string };
  };
}

interface ExportButtonsProps {
  items: VaultItemForExport[];
  availableTracks: Track[];
  dueCount: number;
}
```

**Step 3: Add filter state**

```tsx
const [selectedExportDifficulties, setSelectedExportDifficulties] = useState<string[]>([]);
const [selectedExportTrackIds, setSelectedExportTrackIds] = useState<string[]>([]);
```

**Step 4: Add live count calculation**

```tsx
const exportCount = useMemo(() => {
  return items.filter(item => {
    if (selectedExportDifficulties.length > 0) {
      const d = item.difficulty || 'NORMAL';
      if (!selectedExportDifficulties.includes(d)) return false;
    }
    if (selectedExportTrackIds.length > 0) {
      if (!selectedExportTrackIds.includes(item.sentence.track.id)) return false;
    }
    return true;
  }).length;
}, [items, selectedExportDifficulties, selectedExportTrackIds]);
```

**Step 5: Update exportAudio for filtered type**

Change the `exportAudio` function signature and body:
```tsx
const exportAudio = async (type: 'all' | 'due' | 'filtered') => {
  setIsExporting(type);
  try {
    const body: Record<string, unknown> = { type };
    if (type === 'filtered') {
      if (selectedExportDifficulties.length > 0) body.difficulties = selectedExportDifficulties;
      if (selectedExportTrackIds.length > 0) body.trackIds = selectedExportTrackIds;
    }
    const response = await fetch('/api/audio/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // ... rest of download logic unchanged
```

**Step 6: Add filter UI and updated buttons to JSX**

Replace the entire return JSX:
```tsx
return (
  <div className="mb-6 -mt-6 space-y-3">
    {/* Filter row */}
    <div className="flex flex-wrap gap-4 p-3 bg-slate-50 border rounded-lg">
      {/* Difficulty filter */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Difficulty</p>
        <div className="flex gap-1.5">
          {[
            { value: 'NORMAL', label: 'Normal' },
            { value: 'HARD', label: 'Hard' },
            { value: 'VERY_HARD', label: 'Very Hard' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedExportDifficulties(prev =>
                prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
              )}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                selectedExportDifficulties.includes(value)
                  ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Track filter */}
      {availableTracks.length > 0 && (
        <div className="flex-grow">
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Tracks</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTracks.map(track => (
              <button
                key={track.id}
                onClick={() => setSelectedExportTrackIds(prev =>
                  prev.includes(track.id) ? prev.filter(id => id !== track.id) : [...prev, track.id]
                )}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all max-w-[160px] truncate ${
                  selectedExportTrackIds.includes(track.id)
                    ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                title={track.title}
              >
                {track.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Export buttons */}
    <div className="flex gap-3 flex-wrap">
      <Button
        onClick={() => exportAudio('filtered')}
        disabled={isExporting !== null || exportCount === 0}
        className="flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        {isExporting === 'filtered' ? 'Exporting...' : `Export Audio (${exportCount})`}
      </Button>
      <Button
        onClick={() => exportAudio('due')}
        variant="outline"
        disabled={isExporting !== null || dueCount === 0}
        className="flex items-center gap-2"
      >
        <Clock className="w-4 h-4" />
        {isExporting === 'due' ? 'Exporting...' : `Today's Audio (${dueCount})`}
      </Button>
      <Button
        onClick={exportNotes}
        variant="outline"
        disabled={isExporting !== null || items.length === 0}
        className="flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        {isExporting === 'notes' ? 'Exporting...' : `Export Notes (${items.length})`}
      </Button>
    </div>
  </div>
);
```

Also add `useMemo` to the import at the top: `import { useState, useMemo } from "react";`

**Step 7: Manual test**

1. Visit `/vault`
2. Verify filter chips appear: Normal/Hard/Very Hard + track pills
3. Select "Hard" + "Very Hard" — Export Audio button count updates live
4. Click Export Audio — downloads filtered MP3
5. Select a specific track — count updates again
6. Export — only that track's hard/very hard items exported
7. No selection (all defaults) — exports all vault items

**Step 8: Commit**
```bash
git add src/app/vault/ExportButtons.tsx src/app/vault/page.tsx
git commit -m "feat: add difficulty and track filters to vault export buttons"
```

---

## Complete Feature Test

1. In library, "View Notes" on a track → vault filtered to that track
2. In practice page, "View Notes" → same vault filtered view
3. In vault, set difficulty filter to Hard → "Play All (N)" plays only hard items sequentially
4. Sticky bar appears, auto-advances, shows progress
5. Pause, resume, next, stop all work correctly
6. In export filters, select Very Hard + one track → count updates → export downloads correct MP3
7. Today's Audio and Export Notes buttons still work unchanged
