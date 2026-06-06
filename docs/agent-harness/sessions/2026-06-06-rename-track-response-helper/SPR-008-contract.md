# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-008 |
| Mode | Contract |
| Session | 2026-06-06-rename-track-response-helper |
| Domain | Track rename modal response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire track update response checks to shared helper | `src/components/feature/RenameTrackModal.tsx` | Existing title/type/topic PATCH body and success callbacks stay the same; failed responses preserve parsed server messages |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Track API route behavior | This slice only changes client response parsing |
| OOS-002 | Category/topic option model | Preserve existing user-facing options |
| OOS-003 | Track delete/status/archive flows | Covered by other client response helper slices |
| OOS-004 | Modal visual redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Save still sends title, track type, and track topic to the existing track route | source review and type check |
| AC-PRESERVE-002 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-003 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Rename modal update uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-002 | Parsed `Error.message` remains visible in update toast | failing-then-passing boundary test |
| AC-CHANGE-003 | Local `if (!res.ok) throw new Error("Failed")` is removed | source test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/feature/RenameTrackModal.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
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
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into API behavior, option-model changes, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/components/feature/RenameTrackModal.tsx` and `src/components/feature/RenameTrackModal.test.ts` |
| Data | N/A |
| Deploy | N/A |
