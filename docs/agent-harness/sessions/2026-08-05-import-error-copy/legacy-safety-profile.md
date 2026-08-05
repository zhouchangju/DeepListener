# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-import-error-copy |
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
| Learner-facing import errors | `src/app/library/{UploadButton,BatchUploadButton,ImportMediaWizard,ImportRecoveryList}.tsx`, `src/lib/*copy.ts`, matching tests, locale JSON | import-job state transitions, database schema, provider adapters, media storage, release packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Server error codes, recovery operations, retry behavior, and staged media ownership remain unchanged. | existing import/recovery tests and full quality gate |
| AC-PRESERVE-002 | Provider configuration values and raw error details do not enter learner-facing copy. | source audit and locale tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Known import error codes map to localized learner-facing messages in all import entry points. | pure mapping tests plus component source tests |
| AC-CHANGE-002 | Unknown/network failures fall back to localized generic recovery copy. | source assertions and full build |

## Stop Conditions

Stop before any protected-data mutation, `.env*` edit, `npm run sync`, or expansion into provider/runtime behavior.

## Rollback

Revert only the touched copy helpers, import UI files, locale entries, tests, and this session evidence. No data rollback applies.
