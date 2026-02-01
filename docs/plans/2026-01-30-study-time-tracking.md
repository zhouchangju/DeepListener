# Study Time Tracking System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement a precision time tracking system to monitor study hours towards the 400h C1 goal, distinguishing between Listening, Shadowing, and Review.

**Architecture:**
- **Database:** New `StudySession` table to store aggregated daily duration per type.
- **Backend:** API `/api/study-time` to handle upsert (increment duration) logic.
- **Frontend Context:** `TimeTrackingProvider` to manage global timer, activity detection (mouse/keyboard/media), and heartbeat reporting.
- **Integration:** Components (`ShadowingConsole`, `ReviewClient`) update the Context mode.
- **Dashboard:** New progress bar and history list.

**Tech Stack:** Next.js 15, Prisma (SQLite), React Context, Recharts (optional for history, or simple list).

---

### Task 1: Database Schema & API

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/api/study-time/route.ts`
- Test: `scripts/test-study-time-api.ts`

**Step 1: Update Prisma Schema**
- Add `StudySession` model:
    - `id String @id @default(uuid())`
    - `date DateTime` (We will store YYYY-MM-DD 00:00:00)
    - `duration Int` (Seconds)
    - `type String` (LISTENING, SHADOWING, REVIEW)
    - `createdAt`, `updatedAt`
    - `@@unique([date, type])` to ensure daily aggregation.
- Run migration.

**Step 2: Create Upsert API**
- Create `POST /api/study-time`.
- Payload: `{ type: string, duration: number }`.
- Logic:
    - Calculate "Today" (set hours to 00:00:00 local time? Ideally UTC to avoid timezone mess, but "Daily" implies user's day. Let's use UTC date string 'YYYY-MM-DD' converted to Date).
    - `prisma.studySession.upsert`:
        - update: `duration: { increment: duration }`
        - create: `date: today, type, duration`

**Step 3: Verify API**
- Create script `scripts/test-study-time-api.ts` to mock a request and check DB.

**Step 4: Commit**
```bash
git add prisma/schema.prisma src/app/api/study-time/route.ts scripts/test-study-time-api.ts
git commit -m "feat: add StudySession schema and heartbeat API"
```

---

### Task 2: TimeTrackingContext & Provider

**Files:**
- Create: `src/contexts/TimeTrackingContext.tsx`
- Modify: `src/app/layout.tsx` (Wrap app)

**Step 1: Create Context**
- `TimeTrackingContext` provides:
    - `setMode(mode: 'LISTENING' | 'SHADOWING' | 'REVIEW' | 'IDLE')`
- Internal logic:
    - `lastActiveTime` ref.
    - `useEffect` listeners for `mousemove`, `keydown`, `click` -> update `lastActiveTime`.
    - `useEffect` interval (10s):
        - Check `document.activeElement` or `audio` playing?
        - If audio playing OR (`now - lastActiveTime < 60s`):
            - Send heartbeat to API (`duration: 10`, `type: currentMode`).
            - If `mode` is `IDLE`, don't send.

**Step 2: Audio Detection (Tricky)**
- How to detect if ANY audio is playing?
- Global `window.addEventListener('play', ..., true)` (capture phase) to detect start.
- `pause`/`ended` to detect stop.
- Maintain `isPlaying` state in Context.

**Step 3: Wrap Layout**
- Wrap `children` in `RootLayout` with `<TimeTrackingProvider>`.

**Step 4: Commit**
```bash
git add src/contexts/TimeTrackingContext.tsx src/app/layout.tsx
git commit -m "feat: implement global TimeTrackingProvider with activity detection"
```

---

### Task 3: Integration with Feature Components

**Files:**
- Modify: `src/components/feature/ShadowingConsole.tsx`
- Modify: `src/app/practice/[id]/PracticeClient.tsx`
- Modify: `src/app/review/ReviewClient.tsx`

**Step 1: Practice Page (Listening)**
- In `PracticeClient`, `useEffect`:
    - On mount: `setMode('LISTENING')`
    - On unmount: `setMode('IDLE')`

**Step 2: Shadowing Mode**
- In `ShadowingConsole` (which is inside PracticeClient):
    - On mount: `setMode('SHADOWING')`
    - On unmount: `setMode('LISTENING')` (Restore parent mode)

**Step 3: Review Page**
- In `ReviewClient`:
    - On mount: `setMode('REVIEW')`
    - On unmount: `setMode('IDLE')`

**Step 4: Commit**
```bash
git add src/components/feature/ShadowingConsole.tsx src/app/practice/[id]/PracticeClient.tsx src/app/review/ReviewClient.tsx
git commit -m "feat: integrate components with TimeTrackingContext"
```

---

### Task 4: Dashboard Visualization

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/StatsCharts.tsx` (Add daily list if needed or new component)

**Step 1: Fetch Data**
- In `DashboardPage`, fetch:
    - `totalDuration`: Sum of all `duration`.
    - `todaySessions`: Find many where `date` = Today.

**Step 2: C1 Progress Bar**
- Calculate `progress = totalHours / 400 * 100`.
- Display new Card next to TOEFL Countdown.

**Step 3: Daily List**
- Fetch last 7 days sessions.
- Group by date.
- Display simple list/table.

**Step 4: Commit**
```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: display study time stats and C1 progress on dashboard"
```
