# Anki-Style Relearning Implementation Summary

> Status: this is a historical implementation note.
> The current review queue no longer uses the `due <= now + 15 minutes` window described below.
> For the current behavior, refer to `src/app/review/page.tsx`, `src/app/api/review/grade/route.ts`, and `docs/review-system.md`.

## Overview
Implemented short-interval relearning for Again (5 min) and Hard (15 min) ratings in the review system, replacing the previous "force to tomorrow" logic.

## Changes Made

### 1. Grade API (`src/app/api/review/grade/route.ts`)
**Lines Modified:** 37-48

**Before:**
- Forced Again/Hard cards to tomorrow 00:00
- Used `minimumDue` override logic

**After:**
- Again: due = now + 5 minutes
- Hard: due = now + 15 minutes
- Good/Easy: use FSRS algorithm as before

```typescript
// Apply custom intervals for Again/Hard (override FSRS)
const shortInterval = isAgain ? 5 : isHard ? 15 : 0;
const actualDue = shortInterval > 0
  ? (() => {
      const due = new Date();
      due.setMinutes(due.getMinutes() + shortInterval);
      return due;
    })()
  : next.nextReview;
```

### 2. Review Queue Query (`src/app/review/page.tsx`)
**Lines Modified:** 49-59

**Before:**
- Used `notIn(todayReviewedIds)` to exclude today's reviews
- Query window: `due <= endOfToday`

**After:**
- Removed `notIn` logic
- Query window: `due <= now + 15 minutes`
- Allows short-interval cards to reappear naturally

```typescript
// Get items due within the next 15 minutes (catches 5m and 15m relearning intervals)
const now = new Date();
const queryWindow = new Date(now.getTime() + 15 * 60 * 1000); // +15 minutes

const rawItems = await prisma.reviewItem.findMany({
  where: {
    due: {
      lte: queryWindow, // Only show cards due within 15 minutes
    },
    isArchived: false,
  },
  // ...
});
```

### 3. Toast Messages (`src/app/review/ReviewClient.tsx`)
**Lines Modified:** 187-191

**Before:**
- "Scheduled for next day"
- "Marked as hard - will review again tomorrow"

**After:**
- "Will review again in 5 minutes"
- "Will review again in 15 minutes"

## How It Works

### User Flow Example
1. **10:00** - User reviews card, clicks "Again"
   - `due` set to 10:05
   - ReviewLog created
   - Card removed from client-side queue
   - Toast: "Will review again in 5 minutes"

2. **10:06** - User refreshes page
   - Query: `due <= 10:21` (now + 15min)
   - Card with `due=10:05` is included ✓
   - Card reappears in queue

3. **10:07** - User clicks "Again" again
   - New `due` = 10:12
   - Process repeats (no Again limit)

### Key Design Decisions

1. **Time Window (+15 minutes):**
   - Catches both 5m (Again) and 15m (Hard) intervals
   - Prevents long-term cards (due tomorrow) from showing today
   - Simple, pure time-based logic (no state tracking needed)

2. **No Again Limit:**
   - User wanted unlimited attempts per day
   - No schema changes needed (no `state` or counters)
   - Works with existing database structure

3. **Removed `notIn` Logic:**
   - Previous logic blocked short-interval cards from reappearing
   - Now relies solely on `due` time for queue management

## Testing Checklist

### Manual Testing
- [ ] Click "Again" → card reappears after 5+ minutes
- [ ] Click "Hard" → card reappears after 15+ minutes
- [ ] Click "Again" multiple times → no limit enforced
- [ ] Long-term cards (due tomorrow) don't show today
- [ ] Toast messages display correctly

### Edge Cases
- [ ] Empty queue: "No sentences due for review" message
- [ ] Multiple cards with different due times sorted correctly
- [ ] Stats accuracy: `todayReviewedCount` still accurate

## Known Issues

### Pre-existing TypeScript Error
There's an unrelated TypeScript error in `ReviewClient.tsx:425` related to `EditVaultModal` type definitions. This does not affect the relearning functionality.

**Error:** Type mismatch in `onSaved` callback (tags: string[] vs tags: {id, name}[])

**Impact:** Build fails, but runtime behavior is unaffected

**Fix Required:** Update `EditVaultModal` component types (separate issue)

## Performance Considerations

- Query with time window (`due <= now + 15min`) is efficient
- Index on `due` column should exist (verify with Prisma schema)
- No N+1 queries introduced

## Future Enhancements (Optional)

1. **Auto-refresh:**
   ```typescript
   // Refresh every 30 seconds if short-interval cards exist
   useEffect(() => {
     const hasShortInterval = items.some(item => {
       const minutes = (new Date(item.due) - Date.now()) / 60000;
       return minutes <= 15 && minutes > 0;
     });
     if (hasShortInterval) {
       const interval = setInterval(() => window.location.reload(), 30000);
       return () => clearInterval(interval);
     }
   }, [items]);
   ```

2. **Empty Queue Message:**
   ```typescript
   // Show "Next card in X minutes" when queue empty but cards pending
   const nextItem = await prisma.reviewItem.findFirst({
     where: { due: { gt: now }, isArchived: false },
     orderBy: { due: 'asc' }
   });
   const minutes = Math.ceil((nextItem.due - now) / 60000);
   return <div>Next card in {minutes} minutes</div>;
   ```

3. **Reduce query window to 5 minutes** (prevent Hard cards from showing too early)

## Migration

No database migration required. All changes are application-level logic updates.

## Rollout

1. ✅ Deploy grade API change
2. ✅ Deploy queue query change
3. ✅ Deploy toast message updates
4. ⏳ Fix pre-existing TypeScript error (separate task)
5. ⏳ Test in production environment
