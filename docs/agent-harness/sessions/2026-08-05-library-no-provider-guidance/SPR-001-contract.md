# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-library-no-provider-guidance |
| Domain | Library / first-session usability |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | No-provider Library guidance | `UploadButton.tsx`, both locale message files, tests | A learner without a configured service sees a truthful explanation and executable subtitle/setup links before using generic import. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Import API, provider adapters, upload state machine | Existing contracts are already covered; this sprint only removes a learner-facing dead-end cue. |
| OOS-002 | Real Demo audio, FFmpeg assets, platform installers | External release gates. |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing single-file streaming upload and recovery wiring remain unchanged. | `UploadButton.test.ts` and import-job tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Conditional bilingual hint gives subtitle-first and provider-setup actions only when no service is configured. | source tests, locale terminology tests, browser DOM check |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | unchanged |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library` | Open with no configured providers; inspect import area. | The no-provider explanation and links to `/library?import=subtitle` and `/setup#provider-settings` are visible; configured-provider profiles do not show the warning. |

## Rollback

| Area | Rollback |
|---|---|
| Code/copy | restore scoped files; no data rollback needed |
