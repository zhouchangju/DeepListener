# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | accepted |
| summary | The decision-guide copy now matches the implemented embedded-caption capability: video is the embedded path; audio without a sidecar requires a Provider. |
| next_actions | Keep real FFmpeg/provider and target-user gates open; no further local work is required for this copy fix. |
| artifacts | `legacy-safety-profile.md`, `SPR-001-contract.md` |

## Data Safety

| Check | Result |
|---|---|
| Active database unchanged | pass |
| User media unchanged | pass |
| `.env*` unchanged | pass |
| `npm run sync` not run | pass |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | Import destinations and media/provider behavior remain unchanged. | pass | Existing decision-guide/import-wizard tests; full quality gate. |
| AC-CHANGE-001 | English and Chinese copy no longer claims that audio supports embedded subtitles. | pass | `src/i18n/first-session-language.test.ts` (7/7), message inspection, and production build. |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| `node --import tsx --test src/i18n/first-session-language.test.ts` | pass | 7/7 |
| `npm run verify` | pass | 492 total, 490 passed, 2 Windows capability skips, 0 failures; lint/build pass |
| `git diff --check` | pass | no whitespace errors |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes (local) | Copy now matches actual supported media paths without changing import behavior or protected data. |
