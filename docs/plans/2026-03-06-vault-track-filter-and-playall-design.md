# Vault Track Filter, Play All & Export Enhancement Design

**Date:** 2026-03-06

## Overview

Enhance the Sentence Vault with four related features:
1. Filter vault by track (from library/practice page)
2. Sequential "Play All" with sticky floating player bar
3. Difficulty-based filtered playback (via existing filter + Play All)
4. Extended audio export with difficulty and track filters

## Feature 1: Track-Filtered Vault View

### URL-based filtering
Navigate to `/vault?trackId=abc123` to view vault items for a specific track.

### Entry points
- **Library page** (`TrackList.tsx`): add "View Notes" item to each track card's dropdown menu → navigates to `/vault?trackId=xxx`
- **Practice page** (`practice/[id]/page.tsx`): add "View Notes" link badge in the page header next to track title

### Vault page changes
- `VaultListClient.tsx`: use `useSearchParams()` to read `trackId` from URL
- Extend `filteredItems` useMemo to filter by `item.sentence.track.id === trackId`
- Display a dismissible track name pill at top of filter area: `"Filtered by: Track Title [×]"` — clicking `×` calls `router.push('/vault')`
- No server-side query change needed (all items already loaded client-side, typically <100 items)

## Feature 2: Sequential "Play All" with Sticky Bar

### State additions to `VaultListClient`
```ts
const [playAllActive, setPlayAllActive] = useState(false);
const [playAllIndex, setPlayAllIndex] = useState(0);
const [playAllPaused, setPlayAllPaused] = useState(false);
```

### Behavior
- "Play All" button appears in the top controls row
- Plays `filteredItems` sequentially from index 0
- When a sentence ends, timer callback auto-advances to next item
- End of list: stops and shows toast "Finished playing X sentences"
- Clicking a single item's play button while Play All is active cancels Play All

### Controls
- **Pause/Resume**: halts/restarts timer and audio at current index
- **Next**: skips current sentence, immediately plays next
- **Stop**: clears all play-all state

### Sticky floating bar (shown when `playAllActive`)
```
┌──────────────────────────────────────────────────────────────────────┐
│ ▶ 3 / 12  │ Track Title — "The sentence text being played..."  ⏸ ⏭ ✕ │
└──────────────────────────────────────────────────────────────────────┘
```
- `fixed bottom-0 left-0 right-0` with `z-50`, white background, top shadow
- Shows: progress counter, track title, truncated sentence text, controls

### Difficulty-filtered playback
No separate feature needed. User sets difficulty filter (e.g. Hard + Very Hard), then clicks "Play All" — sequentially plays only filtered items.

## Feature 3: Extended Export UI

### `ExportButtons.tsx` additions
Two filter rows above the existing export buttons:

```
Difficulty:  [Normal] [Hard] [Very Hard]    ← multi-select toggle chips
Tracks:      [All] [Track A] [Track B]...   ← multi-select toggle chips (from availableTracks prop)
```

- `availableTracks` prop: `{ id: string, title: string }[]` — extracted from vault items in `page.tsx`
- Difficulty defaults to all; tracks defaults to "All" (no filter = all tracks)
- Button label shows live count: `"Export Audio (12 sentences)"` — calculated client-side
- Sends `{ type: 'filtered', difficulties: [...], trackIds: [...] }` to export API

### `page.tsx` additions
Extract unique tracks from fetched items and pass to ExportButtons:
```ts
const uniqueTracks = [...new Map(items.map(i => [i.sentence.track.id, i.sentence.track])).values()];
<ExportButtons availableTracks={uniqueTracks} ... />
```

Also pass item data to ExportButtons for live count calculation.

### API: `/api/audio/export/route.ts`
Add `'filtered'` case to `gatherSegments`:
```ts
case 'filtered':
  reviewItems = await prisma.reviewItem.findMany({
    where: {
      isArchived: false,
      ...(difficulties?.length > 0 && { difficulty: { in: difficulties } }),
      ...(trackIds?.length > 0 && { sentence: { trackId: { in: trackIds } } }),
    },
    include: { sentence: { include: { track: true } } },
    orderBy: { createdAt: 'asc' },
  });
```

Existing `'all'` and `'due'` export buttons remain unchanged.

## Files Changed

| File | Change |
|---|---|
| `src/app/api/audio/export/route.ts` | Add `'filtered'` export type with difficulty + trackId filters |
| `src/app/library/TrackList.tsx` | Add "View Notes" dropdown menu item |
| `src/app/practice/[id]/page.tsx` | Add "View Notes" link in page header |
| `src/app/vault/VaultListClient.tsx` | URL track filter, track pill, Play All state + sticky floating bar |
| `src/app/vault/page.tsx` | Extract unique tracks, pass to ExportButtons; read searchParams |
| `src/app/vault/ExportButtons.tsx` | Difficulty + track filter chips, live count, filtered export call |

## Implementation Order

1. API: add `'filtered'` export case (backend foundation)
2. Library: add "View Notes" dropdown item
3. Practice page: add "View Notes" link
4. Vault: URL-based track filter in `VaultListClient`
5. Vault: Play All + sticky floating bar
6. Vault: ExportButtons difficulty + track filter UI
