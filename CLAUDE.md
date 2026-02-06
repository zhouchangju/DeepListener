# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeepListener is an advanced English listening practice platform focusing on "atomic decoding" of speech through intensive listening training, shadowing practice, and spaced repetition. The app features multi-model transcription engines, interactive waveform visualization, and a comprehensive review system.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma (SQLite), WaveSurfer.js, Tailwind CSS, Recharts

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma migrate dev   # Apply schema changes and generate Prisma Client
npx prisma studio        # Visual database browser (opens at localhost:5555)

# Sync (remote backup)
npm run sync            # Sync uploads/ and dev.db to remote server via rsync
```

**Important:** After modifying `prisma/schema.prisma`, you MUST restart the Next.js dev server for the generated Prisma Client to take effect.

## Environment Configuration

Required `.env` variables:

```bash
# Transcription Provider (choose one)
TRANSCRIPTION_PROVIDER=deepgram  # Recommended: no proxy needed, accurate timestamps
DEEPGRAM_API_KEY=your_key

# Alternatives (may require HTTPS_PROXY in China)
# OPENAI_API_KEY=sk-...
# GOOGLE_API_KEY=AIza...

# Proxy (required for OpenAI/Google in restricted network environments)
HTTPS_PROXY=http://127.0.0.1:7890
```

## Architecture & Code Organization

### Transcription Provider Factory Pattern

Located in `src/lib/transcription/`, the transcription system uses a factory pattern for multi-provider support:

- **Types:** `types.ts` defines `TranscriptionProvider` interface
- **Providers:** `openai-provider.ts`, `deepgram-provider.ts`, `google-provider.ts`
- **Factory:** `factory.ts` instantiates the appropriate provider based on `TRANSCRIPTION_PROVIDER` env var
- **Global Proxy:** Uses `undici` ProxyAgent to intercept Node.js fetch requests (required for OpenAI/Google behind proxy)

**Key Implementation Detail - Deepgram Sentence Splitting:**
Unlike other providers, Deepgram doesn't use utterances. Instead:
1. Request word-level timestamps
2. Locally reconstruct sentences by detecting punctuation (`. ? !`)
3. This avoids ultra-long sentences even during fast speech without pauses

### Database Schema (Prisma)

Core models:
- **Track:** Audio material with metadata (title, type, topic, status, isArchived)
- **Sentence:** Individual sentences with timing (startTime, endTime, formatting JSON)
- **ReviewItem:** SRS items linked to sentences. Uses **FSRS-4.5** algorithm (stability, dr, due, retrieval, lapse). See `docs/review-system.md` for algorithm details.
- **ReviewLog:** History of review sessions (rating, duration)
- **StudySession:** Daily aggregated study time by type (LISTENING, SHADOWING, REVIEW)
- **ErrorTag:** Diagnostic tags (Linking, Vocab, Speed, Grammar, etc.)

**Status Flow:** UNLEARNT → INTENSIVE → ANALYSIS → SHADOWING → SPEED_SHADOWING → PARAPHRASE → LEARNT

### Feature Components Structure

Located in `src/components/feature/`:

- **AudioPlayer.tsx** (400+ lines): Main practice interface with waveform, sentence list, blind mode
- **ShadowingConsole.tsx** (200+ lines): Full-screen shadowing with dual waveforms, recording, comparison
- **MiniWavePlayer.tsx** (100+ lines): Compact player for review cards
- Supporting mods: DiagnosisModal, DifficultySelector, NoteEditor, RenameTrackModal

**Subdirectories:**
- `audio-player/`: Extracted hooks and utilities from AudioPlayer
- `notation/`: Phonetic notation system (stress, linking, reduction, elision markers)
- `shadowing/`: Shadowing-specific utilities

### App Router Structure

```
src/app/
├── page.tsx                          # Landing/home page
├── layout.tsx                        # Root layout with theme provider
├── dashboard/page.tsx                # Analytics dashboard (charts, stats)
├── library/page.tsx                  # Track management (upload, list, filter)
├── practice/[id]/page.tsx            # Main practice interface (RSC + client component)
├── review/page.tsx                   # Spaced repetition review queue
├── vault/page.tsx                    # Saved sentence collection
│   └── VaultListClient.tsx          # Vault list with FSRS stats display
└── api/
    ├── upload/                       # Audio upload & transcription
    ├── track/                        # Track CRUD operations
    ├── sentence/                     # Sentence updates (formatting, difficulty)
    ├── review/
    │   ├── grade/route.ts            # FSRS algorithm integration
    │   └── log/route.ts              # Review logging
    ├── vault/                        # Vault item management
    └── study-time/                   # Study session logging
```

### Review System Statistics

**Review Page (`/review`):**
- **Reviewed**: Today's total reviewed cards (from `ReviewLog` table, deduplicated)
- **In Queue**: Current queue size (items `due <= today` AND not reviewed today)
- Key design: Query excludes already-reviewed items to prevent infinite loops
- Real-time updates: Each grade increments `reviewed` and decrements `queue`

**Vault Page (`/vault`):**
- Displays FSRS metrics for each saved sentence:
  - **Stability (S)**: Memory duration in days
  - **Difficulty (D)**: Absolute difficulty 1-10
  - **R/L**: Retrieval/Lapse counts
- Sorting options: Date added, Review date, Stability, Difficulty
- See `docs/review-system.md` for algorithm details
└── api/                              # API routes
    ├── upload/                       # Audio upload & transcription
    ├── track/                        # Track CRUD operations
    ├── sentence/                     # Sentence updates (formatting, difficulty)
    ├── review/                       # Review queue & grading API
    ├── vault/                        # Vault item management
    └── study-time/                   # Study session logging
```

### State Management

- **TimeTrackingContext:** Global context for tracking active study time (LISTENING/SHADOWING/REVIEW)
- Uses React hooks and Context API (no external state management library)
- Server Components (RSC) handle data fetching, Client Components handle interactivity

### Audio Processing

- **WaveSurfer.js:** Primary waveform visualization library
- **Web Audio API:** Used for zero-delay audio slicing in Shadowing (pre-decoded AudioBuffer in memory)
- **Important:** WaveSurfer instances initialized with `shadowDOM: false` to allow global event capture (right-click drag to pan)

## Code Quality Standards (from GEMINI.md)

### OOP Principles
1. **OCP (Open-Closed):** Open for extension, closed for modification. Use composition and dependency injection.
2. **LSP (Liskov Substitution):** Subtypes must be substitutable for their base types.
3. **DIP (Dependency Inversion):** Depend on abstractions, not concretions.
4. **SRP (Single Responsibility):** One reason to change per module.
5. **ISP (Interface Segregation):** Many specific interfaces > one general interface.
6. **LoD (Law of Demeter):** Minimize object knowledge of other objects.
7. **Composite Reuse:** Favor composition over inheritance.

### Maintainability Metrics
- **Cyclomatic Complexity:** Keep functions under 10 complexity
- **File Size Limit:** Maximum 500 lines per file (split if exceeded)
- **YAGNI:** Avoid over-engineering; build abstractions only when needed
- **Error Handling:** Prefer robust patterns (Result types) over excessive try/catch

### Known Issues & Workarounds

**Gemini Time Confusion:**
Sometimes misinterprets "1:30" as "130 seconds". Frontend has overlap detection in AudioPlayer (`endTime > next.startTime`) for runtime hot-fixing.

**Recharts SSR Dimension Warnings:**
Charts must use fixed pixel heights (not percentages) and delayed rendering via `ChartWrapper` with `setTimeout` to ensure DOM layout completes before ResponsiveContainer initialization.

**Database Client Regeneration:**
After Prisma schema changes, always restart Next.js dev server - the generated Client won't hot-reload.

## Key Technical Decisions

1. **SQLite for Database:** Simple, portable, sufficient for single-user app. Schema uses indexes on frequently queried fields (isArchived, status, createdAt).

2. **Undici for Proxy:** Node.js 18+ native fetch doesn't respect HTTP_PROXY. Using `undici` setGlobalDispatcher with ProxyAgent ensures OpenAI/Google API calls go through proxy in China.

3. **Server Components + Client Hydration:** Data fetching on server (fast, SEO-friendly), interactivity on client (audio controls, recording).

4. **Dual-Track Architecture:**
   - Track metadata in SQLite (searchable, filterable)
   - Audio files in `public/uploads/` (served as static assets)
   - Transcription stored as JSON string in Track.transcription

5. **Shadowing Zero-Delay:**
   - Pre-decode entire audio to AudioBuffer on load
   - Slice in memory when switching sentences
   - Avoids network/decode latency that would break immersion flow

## Testing & Debugging

- **Visual Database:** `npx prisma studio` - browse tables, relationships, and test queries
- **Network Tab:** Check proxy is working (should see proxy IP in request headers)
- **Console:** Recharts warnings indicate dimension issues - use fixed heights in CardContent
- **Time Tracking:** Study time only accumulates during active playback or user interaction (60-second timeout)
