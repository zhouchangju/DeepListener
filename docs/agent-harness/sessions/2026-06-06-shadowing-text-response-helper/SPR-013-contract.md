# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-013 |
| Mode | Contract |
| Session | 2026-06-06-shadowing-text-response-helper |
| Domain | Shadowing sentence text client response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire Shadowing sentence text save response checks to the shared helper | `src/components/feature/ShadowingConsole.tsx` | Existing PATCH body, formatting reset, edit-mode close, router refresh, and success toast stay the same; failed responses preserve parsed server messages |
| FEAT-002 | Make touched Shadowing state resets satisfy the zero-warning lint gate | `src/components/feature/ShadowingConsole.tsx` | Sentence changes still reset formatting/edit/dictation state; dictation mode still auto-plays once after audio readiness |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Sentence API route behavior | This slice only changes client response parsing |
| OOS-002 | Shadowing audio, dictation, recording, or keyboard workflow | Preserve existing practice behavior |
| OOS-003 | Formatting autosave behavior | Separate async autosave path is intentionally unchanged |
| OOS-004 | UI redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Successful text save still PATCHes `text` and `formatting: null`, clears local formatting, exits edit mode, refreshes the route, and shows success | source review and TypeScript check |
| AC-PRESERVE-002 | Shadowing action button layout helper remains stable | existing ShadowingConsole test |
| AC-PRESERVE-003 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-004 | Protected data, uploads, and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Shadowing text save uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-002 | Parsed `Error.message` remains visible in the save-text toast | failing-then-passing boundary test |
| AC-CHANGE-003 | Touched Shadowing state reset paths no longer trigger `react-hooks/set-state-in-effect` warnings | source-scoped ESLint |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/feature/ShadowingConsole.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
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
| Sprint expands into sentence API behavior, audio workflow, dictation workflow, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/components/feature/ShadowingConsole.tsx` and the new assertions in `src/components/feature/ShadowingConsole.test.ts` |
| Data | N/A |
| Deploy | N/A |
