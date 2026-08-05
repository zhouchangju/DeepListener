# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-demo-removal |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged/unknown | read-only checks | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | unchanged/unknown | no access | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | unchanged/unknown | no access | edit or print values |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Demo data safety UI | `src/app/setup/DataSafetyActions.tsx`, setup translations, focused tests | Demo seed semantics, Prisma schema, media assets, backup implementation |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Demo deletion remains scoped to `Track.trackType = "DEMO"`; personal tracks are untouched | existing `src/lib/demo-seed.test.ts` and API contract tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Setup exposes an explicit, confirmed action to remove seeded Demo content when it exists | `DataSafetyActions.test.ts`, lint/build |

## Stop Conditions

Stop before touching `prisma/dev.db`, `public/uploads/`, `public/videos/`, `.env*`, migrations, or sync. The UI must call the existing scoped API only.

## Rollback

Code rollback is limited to the touched UI, translation, test, and documentation files. No runtime data is changed by implementation or verification.
