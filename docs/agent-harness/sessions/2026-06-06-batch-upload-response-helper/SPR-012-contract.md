# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-012 |
| Mode | Contract |
| Session | 2026-06-06-batch-upload-response-helper |
| Domain | Batch upload client response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire batch upload top-level response checks to the shared helper | `src/app/library/BatchUploadButton.tsx` | Existing form data, success/failed response parsing, progress rendering, and first-success practice route navigation stay the same; failed top-level responses preserve parsed server messages |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Upload API route behavior | This slice only changes client response parsing |
| OOS-002 | Single upload behavior | Already covered by SPR-011 |
| OOS-003 | Per-file `failed[]` result semantics | Preserve existing multi-file workflow behavior |
| OOS-004 | Transcription provider behavior | Not touched and not executed |
| OOS-005 | Upload UI redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Successful batch upload still reads JSON, updates per-file progress, and routes to the first successful track | source review and type check |
| AC-PRESERVE-002 | Per-file `failed[]` errors from successful API responses remain visible in progress rows | source review and targeted boundary test scope |
| AC-PRESERVE-003 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-004 | Protected data, uploads, and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Batch upload top-level failures use `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-002 | Parsed `Error.message` remains visible in the batch upload toast and progress item details | failing-then-passing boundary test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/library/BatchUploadButton.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
| `node scripts/run-node-tests.mjs` | broader tests | yes | exits 0 |
| `node node_modules/eslint/bin/eslint.js src scripts --max-warnings=0` | source-scoped lint | yes | exits 0 |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | type check | yes | exits 0 |
| `node scripts/next-build.mjs` | production build | yes | exits 0 or documented environment blocker |
| `git status --short -- prisma/dev.db public/uploads '.env*'` | protected data check | yes | no output |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | N/A | Not run | Response-helper refactor with targeted source tests; no visual UI change intended |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data or upload file operation needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into API behavior, transcription behavior, single upload, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/app/library/BatchUploadButton.tsx` and `src/app/library/BatchUploadButton.test.ts` |
| Data | N/A |
| Deploy | N/A |
