# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-07-02-upload-drop-dialog |
| Domain | Library upload UI |
| Owner | AI Agent |
| Date | 2026-07-02 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Add a drag-and-drop dialog before selecting upload files | `src/app/library/UploadButton.tsx`, `src/app/library/BatchUploadButton.tsx`, adjacent tests/components | Single and batch upload buttons open a modal where users can drag audio files or still open the native file picker |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Upload API behavior | User requested client-side interaction only |
| OOS-002 | Prisma/database/uploaded files | No data model or stored audio change is needed |
| OOS-003 | Sync/deployment settings | Not part of upload selection UX |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Single upload keeps `POST /api/upload`, `file` form field, success toast, and practice navigation | targeted test and source review |
| AC-PRESERVE-002 | Batch upload keeps `PUT /api/upload`, `files` form fields, `multiple`, progress details, and practice navigation | targeted test and source review |
| AC-PRESERVE-003 | Native file picker remains available after opening the dialog | targeted test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Single upload button opens a drag-and-drop dialog instead of immediately opening the native picker | targeted test |
| AC-CHANGE-002 | Batch upload button opens a drag-and-drop dialog that accepts multiple audio files | targeted test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/library/UploadButton.test.ts src/app/library/BatchUploadButton.test.ts` | targeted upload UI regression | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library` | Open single and batch modes, inspect upload dialog affordances | Dialog exposes drag-and-drop zone and native chooser button |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into API behavior | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert touched files in `src/app/library` and this session directory |
| Data | N/A |
| Deploy | N/A |
