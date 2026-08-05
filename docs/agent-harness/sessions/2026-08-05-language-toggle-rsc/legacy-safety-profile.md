# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-language-toggle-rsc |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; unrelated user work present elsewhere | no operation | delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | exists | no operation | delete, overwrite, or sync |
| DATA-SAFE-003 | `.env*` | present/unknown | no operation | edit or print secrets |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Locale preference UI | `src/components/preferences/LanguageToggle.tsx`, its regression test | setup, Prisma, media, API, and message copy |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Clicking the control writes the opposite supported locale to `NEXT_LOCALE` | targeted source contract and existing i18n tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Locale changes start a fresh document request instead of merging a refreshed RSC payload into the current Turbopack session | targeted regression test, lint, test suite, build |

## Stop Conditions

- Do not touch persisted data, uploads, videos, `.env*`, sync, or unrelated dirty files.
- Stop if the fix requires changing locale routing or deployment configuration.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | Revert `LanguageToggle.tsx` and its test | No data migration or persistent-data write |
