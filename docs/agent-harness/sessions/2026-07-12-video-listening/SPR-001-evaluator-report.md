# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | success |
| summary | Generic local video listening is implemented, migrated, and verified without changing existing learning records. |
| next_actions | User acceptance with a real lesson video. |
| artifacts | This report, sprint contract, safety profile, migration SQL, targeted tests. |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `docs/agent-harness/sessions/2026-07-12-video-listening/SPR-001-contract.md` |
| Safety profile | `docs/agent-harness/sessions/2026-07-12-video-listening/legacy-safety-profile.md` |
| Domain | Media import, Practice, audio downstream flows, sync boundary, Prisma |
| Date | 2026-07-12 |
| Evaluator | AI Agent |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | Existing audio behavior remains compatible | pass | Production build and 181-test suite pass; all old Tracks default to `AUDIO`. |
| AC-PRESERVE-002 | Vault, Review, Shadowing, and export remain audio-first | pass | Video Track retains derived `audioUrl`; Practice passes this URL to Shadowing/export; source and regression tests. |
| AC-PRESERVE-003 | Existing learning records remain unchanged | pass | Pre/post table-level `EXCEPT` comparison returned zero differences for all application tables. |
| AC-CHANGE-001 | Import generic local MP4/WebM | pass | Real raw-stream MP4 upload returned `mediaType=VIDEO`, video/audio URLs, and two sentences. |
| AC-CHANGE-002 | Video, waveform, and subtitles share one timeline | pass | Browser showed one video, zero audio elements, rendered waveform; second sentence seek set video time to 1.5 seconds. |
| AC-CHANGE-003 | Embedded subtitles with STT fallback | pass | Real MOV_TEXT fixture produced timed sentences without calling STT; code falls back to configured provider when absent/unusable. |
| AC-CHANGE-004 | Original videos stay outside remote sync | pass | Originals use `public/videos/`; sync scripts only transfer `public/uploads/` and DB; policy test passes. |
| AC-CHANGE-005 | Content-agnostic notes and metadata | pass | No Course/Module/Lesson or course-note fields added; existing generic Track and Vault notes preserved. |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` backed up before migration | pass | `prisma/dev.db.pre-video-20260712-183431.backup`, SHA-256 `28819ae96b75c920dbfcbc4d704da3825bc4863ccf8908ca13272aeccc05f02d`. |
| Migration preserves existing data | pass | SQLite integrity `ok`; 219 existing Tracks; every application table matches backup on all pre-existing columns. |
| Test media cleaned | pass | Temporary Track, video, derived MP3, sentences, and test StudySession removed; uploads returned to 231 files and videos to zero. |
| `.env*` not edited | pass | Git status/diff. |
| `npm run sync` not run | pass | Command history for sprint. |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| `npm run lint` | pass | Exit 0, zero warnings. |
| `npm run build` | pass | Next.js production build and TypeScript completed; all routes generated. |
| targeted tests | pass | 35 tests, 0 failures. |
| `npm run test:ci` | pass | 181 tests, 0 failures. |
| Prisma schema diff | pass | `No difference detected` between live SQLite and `schema.prisma`. |
| SQLite integrity | pass | `PRAGMA integrity_check` returned `ok`. |
| raw-stream media E2E | pass | MP4 streamed, audio extracted, embedded subtitles parsed, Track created, then both assets deleted. |

## Browser Verification

| ID | Route | Result | Evidence |
|---|---|---|---|
| BV-001 | `/practice/[id]` temporary video Track | pass | Video duration 3s and readyState 4; one video/zero audio elements; waveform and two sentences visible. |
| BV-002 | Sentence seek | pass | Clicking sentence 2 moved the shared video clock to 1.5s. |
| BV-003 | Autoplay rejection boundary | pass | QA exposed an unhandled `NotAllowedError`; `playMediaSafely` plus regression test now handles it. |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | accepted-deviation | Prisma history | Live DB records historical migration `20260202092144_add_retelling_session`, whose file was already absent from the repo. | Do not use reset-based migration repair. Current live schema matches Prisma exactly; recover the historical file separately only if future migration-history cleanup is desired. |
| EV-002 | accepted-deviation | Batch import | Batch import still uses multipart parsing; single import is the recommended path for large videos and is fully streaming. | None for v1; use single Import Media for large lessons. |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes | Requested content-agnostic local-video listening workflow is implemented and verified end to end. |

## Handoff Notes

- Import one complete local MP4/WebM per Track. The tool does not split lessons.
- If the file contains usable embedded subtitles, they are used; otherwise the configured transcription provider processes the derived MP3.
- Vault, Review, Shadowing, batch playback, and exports intentionally remain audio-first.
- Original videos stay local in `public/videos/` and are not included in current remote sync.
