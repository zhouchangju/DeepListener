# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-blind-mode-screen-reader |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; active user data | inspect status only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | user media; unchanged | inspect status only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | local configuration | do not read values or edit | any edit or value disclosure |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Audio-player accessibility | `src/components/feature/audio-player/SentenceList.tsx`, its targeted test | audio playback logic, database, uploads, provider configuration, release packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Blind-mode sentence cards remain selectable and their action buttons remain available. | targeted test and browser locator check |
| AC-PRESERVE-002 | Revealed/normal sentence text remains visible and unchanged. | existing UI behavior and build |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Screen readers do not announce sentence text while blind mode visually blurs it. | `aria-hidden={isBlurred}` contract and browser accessibility-tree smoke |

## Stop Conditions

Stop before any protected-data mutation, `.env*` edit, `npm run sync`, or scope expansion.

## Rollback

Revert only the two touched source/test files; no data rollback is applicable.
