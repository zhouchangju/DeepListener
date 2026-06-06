# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-005 |
| Mode | Contract |
| Session | 2026-06-06-client-response-helper |
| Domain | Client mutation response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Move `requireOkResponse` into a shared client helper | `src/lib/client-response.ts` | Existing success/error parsing behavior is preserved and reusable outside Library |
| FEAT-002 | Wire Review grade/archive response checks to the shared helper | `src/app/review/ReviewClient.tsx` | Review state only advances after OK responses, as before, with shared parsing |
| FEAT-003 | Keep Library response handling compatible | `src/app/library/TrackList.tsx`, `src/app/library/track-actions.ts` | Library still surfaces rejected API responses and old helper import remains a re-export |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | API route behavior changes | This slice only changes client response parsing location |
| OOS-002 | Export response parsing | Separate flow already uses export-specific body/blob behavior |
| OOS-003 | UI redesign or toast copy rewrite | Preserve existing user-facing flow |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | OK responses resolve without throwing | shared helper tests |
| AC-PRESERVE-002 | JSON `{ error }` responses throw the server message | shared helper tests |
| AC-PRESERVE-003 | malformed error responses use fallback text | shared helper tests |
| AC-PRESERVE-004 | Library status/archive/delete still use `requireOkResponse` | targeted tests/source grep |
| AC-PRESERVE-005 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | `requireOkResponse` is available from `src/lib/client-response.ts` | failing-then-passing helper tests |
| AC-CHANGE-002 | Review grade/archive response parsing delegates to shared helper | ReviewClient boundary test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/client-response.test.ts src/app/library/track-actions.test.ts src/app/review/ReviewClient.test.ts` | targeted regression | yes | exits 0 |
| `node scripts/run-node-tests.mjs` | broader tests | yes | exits 0 |
| `node node_modules/eslint/bin/eslint.js src scripts --max-warnings=0` | source-scoped lint | yes | exits 0 |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | type check | yes | exits 0 |
| `git status --short -- prisma/dev.db public/uploads '.env*'` | protected data check | yes | no output |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | N/A | Not run | Helper refactor with targeted source tests; no visible UI change intended |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into API route behavior or toast UX redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/client-response.ts`, `src/lib/client-response.test.ts`, `src/app/library/track-actions.ts`, `src/app/library/TrackList.tsx`, `src/app/review/ReviewClient.tsx`, and `src/app/review/ReviewClient.test.ts` |
| Data | N/A |
| Deploy | N/A |
