# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-provider-recommendation |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | existing / protected | status inspection only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | existing / protected | status inspection only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | protected | no values read or edited | any edit or secret output |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Provider decision guidance | `src/lib/provider-guidance.ts`, `src/app/setup/TranscriptionDecisionGuide.tsx`, setup/provider tests, `messages/en.json`, `messages/zh-CN.json` | provider adapters, credentials, network calls, Prisma, Desktop packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Provider guidance remains static, official-link-only, and makes no network request when Setup opens. | provider guidance and setup structure tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Exactly one static provider is marked as the default starting recommendation and the mark is visible/localized in the decision guide. | model test, structure test, i18n test, browser DOM check |

## Data Safety

- No active database, media, environment, secret, or Provider request may be touched.
- The recommendation is a UI/configuration claim only; HG-02 approval remains open.

## Rollback

Restore the scoped model, component, messages, and tests; no data rollback is needed.
