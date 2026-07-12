# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-07-12-video-listening |
| Domain | Media upload / Audio / Practice / Sync |
| Owner | AI Agent |
| Date | 2026-07-12 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Generic local video import | `/library`, `/api/upload`, media helpers | MP4/WebM becomes a video Track plus derived audio and timed transcript |
| FEAT-002 | Video listening workbench | `/practice/[id]`, media player | Video is visible and is the master clock for waveform and sentences |
| FEAT-003 | Video backup boundary | sync scripts/config | Original videos are excluded; DB, notes, and derived audio retain current sync path |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Course/module fields or course-note concepts | Tool must remain content-agnostic |
| OOS-002 | Lesson splitting | User prepares desired source file externally |
| OOS-003 | YouTube/Ed/Kaltura URL ingestion | v1 accepts local files only |
| OOS-004 | Video playback in Vault or Review | Those flows remain audio-first |
| OOS-005 | Applying migration to live local DB | Requires separate explicit data operation |

## Acceptance

| ID | Requirement | Evidence Required |
|---|---|---|
| AC-001 | Audio and video metadata validation is explicit and size-safe | upload policy tests |
| AC-002 | Video processing uses streams/files and cleans partial artifacts on failure | media processing tests/source review |
| AC-003 | Video Track keeps an audio URL for existing downstream flows | schema/API tests |
| AC-004 | Video is the only audible master during Practice | player tests/source review |
| AC-005 | Notes remain generic Track/Vault notes | source review |
| AC-006 | Original videos are not included in sync | sync policy tests |

## Commands

Targeted tests first, then `npm run test:ci`, `npm run build`, and source-scoped ESLint. Do not run `npm run sync` or `prisma migrate dev`.

## Rollback

Revert the sprint files and regenerate Prisma Client from the prior schema. No protected data migration is performed in this session.
