# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-07-12-video-listening |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-07-12 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists, 46,325,760 bytes | inspect only | delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | exists, 231 files | inspect only | delete, overwrite, or sync |
| DATA-SAFE-003 | `.env*` | present/unknown | none | edit or print values |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md` | Route placement |
| RUN-002 | Existing records require `audioUrl` | Prisma schema and playback code | Keep derived audio canonical |
| RUN-003 | Video input is local MP4/WebM in v1 | User decision | No remote URL ingestion |
| RUN-004 | Existing sync copies all of `public/uploads/` | `package.json`, `scripts/sync-safe.sh` | Store original videos outside synced uploads |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Media import and practice | Prisma schema/migration, upload policy/API, Library upload UI, Practice player, sync policy/docs | Course fields, lesson splitting, remote downloads, course notes, LMS features |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Audio uploads and audio-only practice remain compatible | targeted tests and build |
| AC-PRESERVE-002 | Vault, Review, Shadowing, and exports consume audio | source assertions and tests |
| AC-PRESERVE-003 | Protected DB/uploads are not modified during development | before/after stat and git status |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Accept local video and extract a derived audio file for transcription | policy and media-processing tests |
| AC-CHANGE-002 | Show video in Practice with shared transport time | player behavior/structure tests |
| AC-CHANGE-003 | Exclude original video assets from remote sync | sync policy tests |

## Stop Conditions

Stop before applying the Prisma migration to `prisma/dev.db`, running sync, editing secrets, or deleting existing media.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code/schema/migration | revert touched tracked files | migration is created but not applied locally |
| Generated Prisma client | regenerate from prior schema | no database write |
| Data/deploy | N/A | neither is changed in this sprint |
