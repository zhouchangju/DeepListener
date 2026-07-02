# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-07-02-upload-drop-dialog |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-07-02 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists | none needed for this UI change | delete, overwrite, migrate, sync without confirmation |
| DATA-SAFE-002 | `public/uploads/` | exists | none needed for this UI change | delete, overwrite, sync without confirmation |
| DATA-SAFE-003 | `.env*` | `.env` exists | do not read or edit values | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md` | Upload UI lives under `src/app/library` |
| RUN-002 | Uploaded audio is protected local data | `docs/maintenance.md` | Do not touch existing audio files |
| RUN-003 | `npm run sync` writes uploads and DB remotely | `package.json` | Do not run sync |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Library upload UI | `src/app/library/UploadButton.tsx`, `src/app/library/BatchUploadButton.tsx`, adjacent UI/test files | `src/app/api/upload/route.ts`, Prisma schema/data, `public/uploads/`, sync/deploy config |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Single upload still posts one file to `/api/upload` and navigates to practice on success | targeted test and code inspection |
| AC-PRESERVE-002 | Batch upload still posts multiple files with `PUT /api/upload` and keeps progress details | targeted test and code inspection |
| AC-PRESERVE-003 | Direct file picker remains available inside both flows | targeted test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Clicking single upload opens a dialog with drag-and-drop audio selection | targeted test |
| AC-CHANGE-002 | Clicking batch upload opens a dialog with drag-and-drop multi-file selection | targeted test |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/library/UploadButton.test.ts src/app/library/BatchUploadButton.test.ts` | library upload UI | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 |
| `npm run build` | repo | yes | exits 0 |

## Stop Conditions

Stop and ask the user before:

- Deleting, overwriting, migrating, or syncing `prisma/dev.db`
- Deleting, overwriting, or syncing `public/uploads/`
- Running `npm run sync`
- Editing `.env*` or secrets
- Weakening lint, test, type, build, or safety rules
- Expanding the sprint into upload API or data migration work

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert the touched UI/test files | no data writes expected |
| Data | N/A | protected data not modified |
| Deployment | N/A | deployment config not modified |
