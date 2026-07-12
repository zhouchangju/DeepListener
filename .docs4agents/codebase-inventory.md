# Codebase Inventory

Compact project map for agent context. Source of truth: current code, not historical docs.

## Routes

| Route | Purpose | Key Files |
|---|---|---|
| `/` | Landing page | `page.tsx` |
| `/library` | Track management, upload, batch playback | `page.tsx`, `LibraryManager.tsx`, `TrackList.tsx`, `BatchAudioPlayer.tsx`, `useBatchPlayback.ts`, `NotesList.tsx`, `UploadButton.tsx`, `BatchUploadButton.tsx`, `track-actions.ts` |
| `/practice/[id]` | Main practice: waveform, sentence list, blind mode | `page.tsx`, `PracticeClient.tsx` |
| `/review` | FSRS spaced repetition review queue | `page.tsx`, `ReviewClient.tsx`, `ReviewCard.tsx`, `review-queue.ts`, `review-keyboard.ts`, `useReviewAudio.ts` |
| `/vault` | Saved sentence collection with FSRS stats | `page.tsx`, `VaultPageClient.tsx`, `VaultListClient.tsx`, `VaultListItem.tsx`, `VaultFilters.tsx`, `VaultPlayAllBar.tsx`, `vault-query.ts`, `vault-items.ts`, `useVaultPlayback.ts`, `ExportButtons.tsx` |
| `/dashboard` | Analytics: overview, workload, memory, behavior | `page.tsx`, `DashboardTabs.tsx`, `StatsCharts.tsx`, `MemoryCharts.tsx`, `BehaviorCharts.tsx`, `ReviewChart.tsx`, `analytics.ts`, `date-utils.ts`, `types.ts` |
| `/dashboard/symphony` | Symphony automation | `page.tsx` |

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/upload` | Streaming single-file audio/video import, audio extraction, subtitle/transcription processing |
| `GET/PUT/DELETE /api/track/[id]` | Track CRUD |
| `PUT /api/sentence/[id]` | Sentence text/formatting updates |
| `POST /api/review/grade` | FSRS algorithm grading |
| `POST /api/review/log` | Review session logging |
| `GET/POST /api/vault` | Vault list and create |
| `PUT/DELETE /api/vault/[id]` | Vault item update/archive |
| `POST /api/vault/[id]/archive` | Vault archive toggle |
| `POST /api/vault/export` | Vault export |
| `POST /api/audio/export` | Audio export with ffmpeg |
| `POST /api/library/export` | Library export |
| `POST /api/study-time` | Study session logging |
| `GET /api/symphony/state` | Symphony dashboard state |

## Components

### UI Primitives (src/components/ui/)
badge, button, card, dialog, dropdown-menu, progress, skeleton, sonner, textarea

### Feature Components (src/components/feature/)
- **AudioPlayer.tsx**: Main practice interface with waveform, sentence list, blind mode
- **ShadowingConsole.tsx**: Full-screen shadowing with dual waveforms, recording, comparison
- **MiniWavePlayer.tsx**: Compact player for review cards
- **DiagnosisModal.tsx**: Error diagnosis for listening issues
- **DifficultySelector.tsx**: Difficulty level selection
- **NoteEditor.tsx**: Track note editing
- **RichTextNoteEditor.tsx**: Rich text note editing
- **ReviewNoteEditor.tsx**: Review-specific notes
- **EditVaultModal.tsx**: Vault item editing
- **RenameTrackModal.tsx**: Track rename
- **SpeedSelector.tsx**: Playback speed control
- **PWARegistration.tsx**: PWA service worker registration
- **audio-player/**: Extracted hooks and utilities from AudioPlayer
- **notation/**: Phonetic notation (stress, linking, reduction, elision)
- **shadowing/**: Shadowing-specific utilities
- **rich-text/**: Rich text editor utilities

## Lib (src/lib/)

| Module | Purpose |
|---|---|
| `prisma.ts` | Prisma client singleton |
| `fsrs.ts` | FSRS-4.5 spaced repetition algorithm |
| `api-response.ts` | API response helpers |
| `api-schemas.ts` | Zod validation schemas |
| `audio-utils.ts` | Audio processing (ffmpeg export) |
| `client-download.ts` | Client-side file download |
| `client-response.ts` | Client response helpers |
| `domain-constants.ts` | Track status constants and helpers |
| `export-file-policy.ts` | Export file policy |
| `local-day.ts` | Local day boundary utilities |
| `sanitize-html.ts` | HTML sanitization |
| `text-utils.ts` | Text processing utilities |
| `upload-policy.ts` | Audio/video validation, size, storage, and path policy |
| `media-processing.ts` | FFmpeg audio extraction and embedded-subtitle handling |
| `subtitle-utils.ts` | SRT parsing into timestamped sentence segments |
| `utils.ts` | General utilities |
| `transcription/` | Provider factory (deepgram, openai, google) |

## Database (Prisma/SQLite)

Models: Track, Category, TrackCategory, Sentence, ReviewItem, ReviewLog, StudySession, ErrorTag

Status flow: UNLEARNT → INTENSIVE → ANALYSIS → SHADOWING → SPEED_SHADOWING → PARAPHRASE → LEARNT

## Build & Test Commands

| Command | Use |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (via scripts/next-build.mjs) |
| `npm run lint` | ESLint |
| `npm run test:ci` | Run all tests |
| `node --import tsx --test <paths>` | Targeted tests |
| `npx prisma migrate dev` | Apply schema changes |
| `npm run sync` | Rsync uploads + db to remote (HIGH RISK) |
