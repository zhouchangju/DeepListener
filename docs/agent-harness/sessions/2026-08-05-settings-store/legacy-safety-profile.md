# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-settings-store |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | present/unknown contents | no access required; status-only inspection | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | present/unknown contents | no access required; status-only inspection | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | present/unknown values | no edit or value read | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router and Node runtime imports are used | `AGENTS.md`, `src/instrumentation.ts` | settings loading stays server-side |
| RUN-002 | Explicit Desktop data roots and legacy cwd layouts coexist | `src/lib/runtime-paths.ts` | settings path must follow the active root |
| RUN-003 | `secrets.json` may contain legacy non-secret provider fields | existing `src/lib/secrets-store.ts` and tests | new settings store must not break old profiles |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Non-secret settings | `src/lib/settings-store.ts`, `src/lib/runtime-paths.ts`, `src/instrumentation.ts`, provider save integration, focused tests, OpenSpec evidence | UI redesign, Prisma schema/data, media/upload behavior, real OS keychain implementation, Electron packaging/release |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Missing settings do not override legacy `.env`/`secrets.json` routing values. | `settings-store.test.ts` missing-file environment test |
| AC-PRESERVE-002 | Existing provider API and secret persistence contracts remain usable. | provider route and `secrets-store` tests |
| AC-PRESERVE-003 | Protected user data is untouched. | git/status review; no data paths in patch |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Persist only validated, non-secret settings in schema v1. | migration/unknown-field/secret-free tests |
| AC-CHANGE-002 | Promote settings via temp file + atomic rename. | interrupted-promotion test |
| AC-CHANGE-003 | Provider selection/base URL writes use the dedicated settings document while old secrets remain readable. | provider route and instrumentation integration review |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/settings-store.test.ts src/lib/runtime-paths.test.ts src/lib/secrets-store.test.ts src/app/api/setup/provider/route.test.ts` | focused settings/provider regression | yes | exits 0 |
| `npm run test:ci` | full test suite | yes | 535 passed, 2 Windows capability skips |
| `npm run lint` | repository lint | yes | exits 0 |
| `npm run build` | production build/typecheck | yes | exits 0; existing NFT warning only |

## Stop Conditions

No stop condition was reached. No protected data, `.env*`, or sync command was touched.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert the settings-store/runtime/instrumentation/provider integration files | no runtime data is required to roll back |
| Data | N/A; tests use disposable temp roots | active profile remains untouched |
| Deployment | N/A; packaging is out of scope | no release artifacts changed |
