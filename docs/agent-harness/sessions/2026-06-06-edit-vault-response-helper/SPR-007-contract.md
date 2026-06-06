# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-007 |
| Mode | Contract |
| Session | 2026-06-06-edit-vault-response-helper |
| Domain | Vault edit modal response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire lazy note-load response checks to shared helper | `src/components/feature/EditVaultModal.tsx` | Existing lazy note load remains unchanged on success; failed responses preserve parsed server messages |
| FEAT-002 | Wire edit-modal save response checks to shared helper | `src/components/feature/EditVaultModal.tsx` | Existing save success, `onSaved`, and close behavior stay the same; failed responses preserve parsed server messages |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Vault API route behavior | This slice only changes client response parsing |
| OOS-002 | Rich text autosave behavior inside `ReviewNoteEditor` | The embedded note editor has a separate autosave contract |
| OOS-003 | Vault list delete/archive behavior | Covered by SPR-006 |
| OOS-004 | Vault visual redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Save is still ignored when no item is selected | existing EditVaultModal test |
| AC-PRESERVE-002 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-003 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Edit modal lazy note load uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-002 | Edit modal save uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-003 | Parsed `Error.message` remains visible in load/save toasts | failing-then-passing boundary test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/feature/EditVaultModal.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
| `node scripts/run-node-tests.mjs` | broader tests | yes | exits 0 |
| `node node_modules/eslint/bin/eslint.js src scripts --max-warnings=0` | source-scoped lint | yes | exits 0 |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | type check | yes | exits 0 |
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
| Sprint expands into Vault API behavior, autosave semantics, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/components/feature/EditVaultModal.tsx` and `src/components/feature/EditVaultModal.test.ts` |
| Data | N/A |
| Deploy | N/A |
