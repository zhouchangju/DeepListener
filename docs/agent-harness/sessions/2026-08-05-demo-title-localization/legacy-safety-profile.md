# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-demo-title-localization |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | existing active local data | read-only checks only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | existing user media | no operations | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | local configuration present/unknown | do not read values | edit or print secrets |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Learner-facing Library copy | `src/app/library/page.tsx`, `messages/en.json`, `messages/zh-CN.json`, first-session tests | database schema/data, media files, Provider, upload APIs, Desktop packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Stored Demo title and all personal track titles remain unchanged | source inspection + targeted test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Localize only the display title of `DEMO` tracks in Library | targeted test + browser smoke |

## Stop Conditions

- Do not modify `prisma/dev.db`, `public/uploads/`, `public/videos/`, or `.env*`.
- Do not run `npm run sync` or add dependencies.

## Rollback

Revert the touched source, translation, test, and session files; no persisted data was changed.
