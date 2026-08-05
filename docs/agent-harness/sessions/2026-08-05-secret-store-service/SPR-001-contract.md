# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-secret-store-service |
| Domain | API / Audio / Quality Gate |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | T131 secret service boundary | `src/lib/secret-store-service.ts`, `src/lib/secrets-store.ts` | status/save/remove are redacted; operation callback receives one selected credential only |
| FEAT-002 | T034 operation-scoped provider injection | `src/lib/import-jobs/run.ts`, `src/lib/transcription/*` | selected provider config is explicit and never assembled from all provider keys |
| FEAT-003 | Connectivity probe credential boundary | `src/app/api/setup/provider/test/route.ts` | explicit user-triggered probe also receives only the selected provider credential |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | T132 provider status taxonomy/persistence and T133 Settings UI | separate follow-up work; only the credential boundary of the existing probe is covered here |
| OOS-002 | OS keychain/Windows credential backend | platform implementation task |
| OOS-003 | Live provider/network tests | requires explicit credentials and consent |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Existing import/retry/subtitle behavior remains green. | targeted tests and full test suite |
| AC-CHANGE-001 | Service has no credential read-back method. | service surface test |
| AC-CHANGE-002 | Provider factory accepts explicit runtime config. | factory test |
| AC-CHANGE-003 | Import callback receives only selected provider key. | credential-scope import test |
| AC-CHANGE-004 | Connectivity probe receives only selected provider key. | provider route credential-scope test |

## Commands

| Command | Purpose | Result |
|---|---|---|
| `node --import tsx --test src/lib/transcription/factory.test.ts src/lib/secret-store-service.test.ts src/lib/secrets-store.test.ts src/lib/import-jobs/run.test.ts src/lib/import-jobs/provider-failure-injection.test.ts src/lib/import-jobs/activation.test.ts src/app/api/setup/provider/test/route.test.ts` | targeted regression | pass: 38, skip: 1 |
| `npm run lint` | repository lint | pass |
| `npm run test:ci` | full tests | pass: 545, skip: 2 |
| `npm run build` | production build | pass; existing Turbopack NFT warning only |

## Data Safety

`prisma/dev.db`, `public/uploads/`, `public/videos/`, and `.env*` were not edited or migrated. `npm run sync` was not run.

## Rollback

Revert only the source/test files listed above; no persisted data rollback is needed.
