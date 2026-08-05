# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-provider-status-followup |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged | inspect status only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` and `public/videos/` | unchanged | inspect status only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not edited or printed | inspect status names only | edit or print values |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Provider status/API and Settings focus | `src/app/api/setup/provider/test/**`, `src/lib/upload-error.*`, `src/app/setup/ProviderCardActions.*`, task/status evidence | real provider credentials/network, Desktop packaging, Prisma, media assets, user-study gates |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Connectivity probes use only the selected provider and never create a Track/import manifest. | route isolation/redaction tests |
| AC-PRESERVE-002 | Protected local data and credentials remain untouched. | git status and command log |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Classify credential, network/proxy/quota/timeout, and empty-transcript outcomes safely; never mark an empty transcript verified. | targeted route and error-taxonomy tests |
| AC-CHANGE-002 | Return keyboard focus to the stable provider configuration entry after dialog close. | targeted source test and browser smoke |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/upload-error.test.ts src/app/api/setup/provider/test/route.test.ts src/app/api/setup/provider/route.test.ts` | provider slice | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 with no warnings |
| `npm run build` | repo | yes | exits 0 |
| `npm run test:ci` | repo | yes | exits 0; Windows capability skips documented |

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert the touched provider/error files | no protected data mutation |
| Data | N/A | no data operation was run |
