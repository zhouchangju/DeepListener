# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-language-toggle-rsc |
| Domain | Locale preference UI |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Fix the runtime error triggered by switching languages | `LanguageToggle.tsx` and regression test; all routes using `AppShell` | Write the locale cookie and perform a full reload without `router.refresh()` |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Locale dictionaries and translated copy | Not implicated in the RSC decoding failure |
| OOS-002 | Existing setup, database recovery, demo audio, and packaging edits | Pre-existing user work |

## Acceptance

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Toggle still computes and writes the opposite locale | targeted regression test |
| AC-CHANGE-001 | Toggle does not use an RSC refresh and instead reloads the document | targeted regression test |
| DATA-SAFE-001 | Protected data and unrelated dirty files remain untouched | scoped diff and status inspection |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/preferences/LanguageToggle.test.ts` | targeted regression | yes | exits 0 |
| `npm run verify` | CI-equivalent quality gate | yes | exits 0 |

## Rollback

| Area | Rollback |
|---|---|
| Code | Restore the prior `router.refresh()` implementation and remove the regression test |
| Data | N/A; no data operations |
| Deploy | N/A |
