# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-batch-upload-preflight |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | absent in this checkout | inspect status only | delete, overwrite, migrate, or sync |
| DATA-SAFE-002 | `public/uploads/` | present with repository placeholder only | inspect status only | delete, overwrite, or sync |
| DATA-SAFE-003 | `public/videos/` | present with repository placeholder only | inspect status only | delete, overwrite, or sync |
| DATA-SAFE-004 | `.env*` | no local env files present | do not read values | edit, print, or create secrets |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Batch import client preflight | `src/app/library/BatchUploadButton.tsx`, its tests, `messages/en.json`, `messages/zh-CN.json` | API routes, import-job state machine, Provider calls, Prisma, media files, packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Valid batch files continue through the existing multipart upload and recovery flow unchanged. | BatchUploadButton tests and full test suite |
| AC-PRESERVE-002 | A no-Provider batch containing audio remains blocked before upload. | Existing targeted test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Reject any invalid/empty/oversized/unsupported batch file before constructing `FormData` or calling `/api/upload`. | New structure test and source inspection |
| AC-CHANGE-002 | Show a localized, actionable message naming the rejected local file. | English/Chinese message parity and component test |

## Commands

| Command / Check | Required? | Expected Result |
|---|---|---|
| `node --import tsx --test src/app/library/BatchUploadButton.test.ts src/lib/client-upload-validation.test.ts src/i18n/first-session-language.test.ts` | yes | exits 0 |
| `npm run lint` | yes | exits 0 |
| `npm run test:ci` | yes | exits 0 with only documented Windows capability skips |
| `npm run build` | yes | exits 0; existing non-blocking NFT warning may remain |

## Stop Conditions

Stop before changing server upload policy, import-job transitions, Provider selection, protected data, `.env*`, or `npm run sync`.

## Rollback

Revert the batch component, its tests, and the two message keys. No data rollback is required because invalid batches are rejected before a request is made.
