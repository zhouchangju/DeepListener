# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-011 |
| Mode | Contract |
| Session | 2026-06-06-single-upload-response-helper |
| Domain | Single upload client response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire single upload response checks to shared helper | `src/app/library/UploadButton.tsx` | Existing form data, success toast, JSON parsing, and practice route navigation stay the same; failed responses preserve parsed server messages |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Upload API route behavior | This slice only changes client response parsing |
| OOS-002 | Batch upload behavior | Separate multi-file workflow |
| OOS-003 | Transcription provider behavior | Not touched and not executed |
| OOS-004 | Upload UI redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Successful upload still reads JSON and routes to `/practice/:id` | source review and type check |
| AC-PRESERVE-002 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-003 | Protected data, uploads, and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Single upload uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-002 | Parsed `Error.message` remains visible in upload toast | failing-then-passing boundary test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/library/UploadButton.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
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
| Sprint expands into API behavior, transcription behavior, batch upload, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/app/library/UploadButton.tsx` and `src/app/library/UploadButton.test.ts` |
| Data | N/A |
| Deploy | N/A |
