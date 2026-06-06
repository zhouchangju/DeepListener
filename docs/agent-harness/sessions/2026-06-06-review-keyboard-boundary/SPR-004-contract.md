# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-004 |
| Mode | Contract |
| Session | 2026-06-06-review-keyboard-boundary |
| Domain | Review keyboard shortcuts |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Extract Review shortcut rules into a pure helper | `src/app/review/review-keyboard.ts` | Space, R, and 1-4 shortcuts map to the same actions as before |
| FEAT-002 | Wire ReviewClient to the helper | `src/app/review/ReviewClient.tsx` | Component still owns side effects, but no longer owns key-to-action mapping |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Review API behavior | No route or persistence behavior changes needed |
| OOS-002 | Review card visual redesign | This slice is a behavior-boundary refactor |
| OOS-003 | Edit modal or note save flow | Separate concern with higher UI regression risk |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Shortcuts are ignored while editing | helper tests |
| AC-PRESERVE-002 | Space toggles answer and prevents default | helper tests |
| AC-PRESERVE-003 | R replays audio and prevents default | helper tests |
| AC-PRESERVE-004 | 1-4 map to again/hard/good/easy | helper tests |
| AC-PRESERVE-005 | Existing queue/audio/card boundaries remain delegated | ReviewClient boundary tests |
| AC-PRESERVE-006 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Review shortcut mapping is a pure tested helper | failing-then-passing helper tests |
| AC-CHANGE-002 | `ReviewClient` delegates shortcut mapping | source grep and TypeScript |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/review/review-keyboard.test.ts src/app/review/review-queue.test.ts src/app/review/ReviewClient.test.ts` | targeted regression | yes | exits 0 |
| `node scripts/run-node-tests.mjs` | broader tests | yes | exits 0 |
| `node node_modules/eslint/bin/eslint.js src scripts --max-warnings=0` | source-scoped lint | yes | exits 0 |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | type check | yes | exits 0 |
| `git status --short -- prisma/dev.db public/uploads '.env*'` | protected data check | yes | no output |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | N/A | Not run | Pure shortcut mapping refactor; no visual UI change intended |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into Review API or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/app/review/review-keyboard.ts`, `src/app/review/review-keyboard.test.ts`, and `src/app/review/ReviewClient.tsx` |
| Data | N/A |
| Deploy | N/A |
