# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-secret-store-service |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | existing/untouched | read-only status checks | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | existing/untouched | no operation | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | existing/unknown values | do not read or edit values | print or edit secrets |

## Domain Boundary

| Domain | In Scope | Explicitly Out Of Scope |
|---|---|---|
| Provider credential boundary | `src/lib/secret-store-service.ts`, `src/lib/secrets-store.ts`, `src/lib/import-jobs/run.ts`, transcription provider constructors and tests | provider status/connectivity UI (T132/T133), OS-specific Windows backend, real network verification, release packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Subtitle imports do not construct a transcription provider. | `run.test.ts` |
| AC-PRESERVE-002 | Failure-injection factories remain credential-free and retryable. | `provider-failure-injection.test.ts` |
| AC-PRESERVE-003 | Secrets and protected data are not exposed or modified. | service tests, git status, data checks |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Expose only redacted secret state and operation-scoped credential access. | `secret-store-service.test.ts` |
| AC-CHANGE-002 | Pass only the selected provider credential into a provider instance. | `run.test.ts`, `transcription/factory.test.ts` |

## Stop Conditions

- Do not edit `.env*`, `prisma/dev.db`, `public/uploads/`, or run `npm run sync`.
- Do not claim T132/T133, real provider connectivity, desktop signing, or user study gates are complete.

## Rollback

Code-only rollback: revert the touched source/test files. No database, media, or secret migration was performed.
