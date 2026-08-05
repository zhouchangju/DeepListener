# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | scoped-accepted |
| summary | Native directory backup export/import is implemented against the existing manifest-backed directory bundle format. |
| next_actions | Keep archive/ZIP format, platform filename behavior, clean-install, signing, and release QA open; do not claim public Desktop readiness. |
| artifacts | Desktop bridge/main/helper, `/api/backups`, Setup UI, focused tests |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `SPR-001-contract.md` |
| Safety profile | `legacy-safety-profile.md` |
| Domain | Desktop / backup portability / data safety |
| Date | 2026-08-04 |
| Evaluator | AI Agent |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | existing backup API behavior | pass | `src/app/api/backups` route tests; existing list/create/restore behavior remains covered |
| AC-PRESERVE-002 | invalid import cannot activate/list | pass | invalid staging is rejected and removed without touching active data |
| AC-PRESERVE-003 | no renderer path/fs API | pass | `src/lib/desktop-startup-contract.test.ts`, preload/main contract checks |
| AC-CHANGE-001 | native export copy | pass | `desktop/native-backup-contract.test.js`; Unicode destination, checksum/size revalidation, no-overwrite behavior |
| AC-CHANGE-002 | native import staging/promotion | pass | helper/API tests; `.deeplistener-backup-import-<uuid>` staging and safe promotion |
| AC-CHANGE-003 | UI native/fallback behavior | pass | `src/app/setup/DataSafetyActions.test.ts`, Desktop IPC contracts; browser fallback retained |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | scoped accepted | Native directory bundle flow is implemented and verified; release-level platform QA remains outside this sprint acceptance. |

## Verification record

- Focused Desktop helper tests: 5 native-backup scenarios pass; native diagnostics export and bounded logger contracts also pass.
- Focused API/UI/Desktop contract tests pass, including backup creation/listing, conflicting restore confirmation, imported staging promotion, invalid staging cleanup, and renderer boundary checks.
- `npm run lint`: pass.
- `npm run test:ci`: 430 tests, 428 passed, 2 environment-limited skips, 0 failures. The runner now includes `desktop/**/*.test.js` in addition to `src/**/*.test.ts(x)`.
- `npm run build`: pass with the known Windows cross-drive `EXDEV` workaround and non-blocking Turbopack NFT tracing warning.
- This report accepts the scoped implementation only. It does not accept ZIP/archive format, macOS/Windows clean-install or filename QA, signing/notarization, bundled FFmpeg, real Demo provenance, or target-user validation.
