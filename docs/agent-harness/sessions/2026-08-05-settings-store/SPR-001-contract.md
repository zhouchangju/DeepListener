# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-settings-store |
| Domain | Settings / configuration persistence |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Versioned non-secret settings store | `src/lib/settings-store.ts`, `src/lib/runtime-paths.ts` | Defaults, migration, validation, secret-free serialization, and atomic writes under the active data root |
| FEAT-002 | Provider routing compatibility | `src/lib/secrets-store.ts`, `src/instrumentation.ts` | New provider/base URL state is written/read through settings while missing settings preserve legacy behavior |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Prisma schema, database, media, uploads, backups, and migrations | not required for T130 |
| OOS-002 | Real macOS Keychain, Electron packaging, and release QA | separate T131/T182/T183 work |
| OOS-003 | Settings UI and connectivity UX | separate T132/T133 work |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Legacy profiles without `settings.json` still use existing environment/secrets routing. | `loadSettingsIntoEnv` missing-file test |
| AC-PRESERVE-002 | Existing provider status responses remain masked and provider tests remain green. | provider route + full test suite |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Settings have schema version, defaults, old-schema migration, and fail-closed corrupt/future handling. | `settings-store.test.ts` |
| AC-CHANGE-002 | Writes use a same-directory temporary file and atomic promotion; failed promotion preserves the old file. | interrupted-promotion test |
| AC-CHANGE-003 | Credential-shaped unknown fields cannot be serialized into settings. | secret-free serialization test/source review |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged; not accessed |
| DATA-SAFE-002 | `public/uploads/` | unchanged; not accessed |
| DATA-SAFE-003 | `.env*` | not edited or printed |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/settings-store.test.ts src/lib/runtime-paths.test.ts src/lib/secrets-store.test.ts src/app/api/setup/provider/route.test.ts` | focused regression | yes | exits 0 |
| `npm run test:ci` | broader tests | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | typecheck/production build | yes | exits 0 |

## Browser Checks

None. T130 changes server-side persistence only; Settings UI is out of scope.

## Stop Conditions

No protected data change, sync, `.env*` edit, or scope expansion was required.

## Rollback

Revert the scoped source/tests/docs files. No active data migration or destructive operation was performed.
