# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-010 |
| Mode | Contract |
| Session | 2026-06-06-practice-vault-response-helper |
| Domain | Practice save-to-vault response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire Practice save-to-vault response checks to shared helper | `src/app/practice/[id]/PracticeClient.tsx` | Existing POST body, success toast, modal close, and `router.refresh()` stay the same; failed responses preserve parsed server messages |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Vault API route behavior | This slice only changes client response parsing |
| OOS-002 | DiagnosisModal behavior | Preserve existing capture form and defaults |
| OOS-003 | Audio playback, Shadowing, or export behavior | Not related to save-to-vault response parsing |
| OOS-004 | Practice page visual redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Save-to-vault still sends sentence id, tags, note, and difficulty | source review and type check |
| AC-PRESERVE-002 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-003 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Practice save-to-vault uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-002 | Parsed `Error.message` remains visible in save-to-vault toast | failing-then-passing boundary test |
| AC-CHANGE-003 | The uncollected `[id]` colocated test path is avoided | target test file under stable `src/app/practice/` path |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/practice/PracticeClient.structure.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
| `node scripts/run-node-tests.mjs` | broader tests | yes | exits 0 |
| `node node_modules/eslint/bin/eslint.js src scripts --max-warnings=0` | source-scoped lint | yes | exits 0 |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | type check | yes | exits 0 |
| `node scripts/next-build.mjs` | production build | yes | exits 0 or documented environment blocker |
| `git status --short -- prisma/dev.db public/uploads '.env*'` | protected data check | yes | no output |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | N/A | Not run | Response-helper refactor with targeted source tests; no visible UI change intended |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into API behavior, diagnosis form behavior, audio, Shadowing, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/app/practice/[id]/PracticeClient.tsx` and `src/app/practice/PracticeClient.structure.test.ts` |
| Data | N/A |
| Deploy | N/A |
