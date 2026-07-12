# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-07-12-video-subtitle-bar |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-07-12 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists | read-only inspection if needed | delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | exists | no operation | delete, overwrite, or sync |
| DATA-SAFE-003 | `public/videos/` | exists and ignored | read-only browser playback | delete, overwrite, commit, or sync |
| DATA-SAFE-004 | `.env*` | present/unknown | no operation | edit or expose values |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Video practice UI | `AudioPlayer`, video-subtitle helpers/components/tests, `/practice/[id]`, related docs | Prisma, upload/transcription, Review, Vault, Shadowing, sync, deployment |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Video remains the single shared playback master | structure test and browser check |
| AC-PRESERVE-002 | Audio-only practice has no subtitle control | conditional render inspection and tests |
| AC-PRESERVE-003 | Protected local data remains unchanged | Git status and command history |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Video practice has a default-off subtitle bar aligned to sentence timing | helper/component tests and browser check |

## Stop Conditions

Stop before any protected-data write, sync, environment edit, schema change, or unrelated workflow expansion.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code and docs | Revert the feature commits | No persisted-data rollback is required |

