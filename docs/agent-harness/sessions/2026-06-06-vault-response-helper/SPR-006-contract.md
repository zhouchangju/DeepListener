# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-006 |
| Mode | Contract |
| Session | 2026-06-06-vault-response-helper |
| Domain | Vault client mutation response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire Vault delete response checks to shared helper | `src/app/vault/VaultListClient.tsx` | Delete success toast/refresh behavior stays the same; failures use shared error parsing |
| FEAT-002 | Wire Vault archive response checks to shared helper | `src/app/vault/VaultListClient.tsx` | Archive success toast/refresh behavior stays the same; failures use shared error parsing |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Vault API route behavior | This slice only changes client response parsing |
| OOS-002 | Note lazy-load response handling | Read-only note loading has different UI behavior and is outside this mutation slice |
| OOS-003 | Vault export response handling | Export flow consumes body/blob and has separate contracts |
| OOS-004 | Vault visual redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Vault date helper boundary remains intact | existing VaultListClient test |
| AC-PRESERVE-002 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-003 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Vault delete mutation uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-002 | Vault archive mutation uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-003 | No local `if (!res.ok) throw new Error()` remains in `VaultListClient` | source grep/test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/vault/VaultListClient.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
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
| Sprint expands into Vault API behavior or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/app/vault/VaultListClient.tsx` and `src/app/vault/VaultListClient.test.ts` |
| Data | N/A |
| Deploy | N/A |
