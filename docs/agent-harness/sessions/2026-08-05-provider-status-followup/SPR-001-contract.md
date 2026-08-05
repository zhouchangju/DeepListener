# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-provider-status-followup |
| Domain | API / Audio / Quality Gate |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Provider connectivity error taxonomy | `/api/setup/provider/test`, `src/lib/upload-error.ts` | credential/auth → `invalid`; network/proxy/quota/timeout → `unknown`; empty transcript → safe 422 and never `verified` |
| FEAT-002 | Settings dialog focus recovery | `src/app/setup/ProviderCardActions.tsx` | Esc/deep-link close returns focus to the configuration entry button |
| FEAT-003 | Verification evidence | route/error/UI tests and OpenSpec status | all claims backed by bounded commands and explicit external/manual gates |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | real Provider credentials, network, or quota calls | requires user-owned credentials and external approval |
| OOS-002 | Desktop packaging, signing, clean install, and target-user sessions | separate release and human-gate tasks |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Response bodies contain no credential, transcript, absolute temp path, or raw SDK error. | route redaction tests |
| AC-PRESERVE-002 | Probe writes only to an OS temp directory and cleans it before response. | route temp-file test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Add proxy classification and reject empty connectivity transcripts. | targeted tests |
| AC-CHANGE-002 | Restore focus after closing the provider dialog. | targeted test and browser smoke |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` and `public/videos/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited or printed |

## Commands

| Command | Purpose | Result |
|---|---|---|
| targeted provider tests | regression | pass, 22/22 |
| `npm run lint` | lint | pass |
| `npm run build` | production build | pass; known NFT warning only |
| `npm run test:ci` | full regression | pass, 551 passed, 2 Windows capability skips |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/setup#provider-settings` | open dialog and exercise keyboard/focus/ESC | pending manual check; not claimed by this sprint |

## Stop Conditions

Stop before any real provider request, credential change, protected-data operation, `.env*` edit, or scope expansion.

## Rollback

Revert only the provider/error taxonomy files and their tests; no database or media rollback is required.
