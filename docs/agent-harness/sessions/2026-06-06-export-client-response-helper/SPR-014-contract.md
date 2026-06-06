# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-014 |
| Mode | Contract |
| Session | 2026-06-06-export-client-response-helper |
| Domain | Client export failure response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Wire export clients to shared failed-response parsing | `src/app/vault/ExportButtons.tsx`, `src/app/practice/[id]/PracticeClient.tsx`, `src/app/review/ReviewClient.tsx`, `src/app/library/LibraryManager.tsx` | Existing request bodies, loading states, download helpers, success toasts, and fallback error toasts stay the same; failed export responses preserve parsed server messages |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Export API route behavior | This slice only changes client response parsing |
| OOS-002 | Download filename/blob/text helpers | Preserve existing tested download behavior |
| OOS-003 | Export filters or selection behavior | Preserve current request-body semantics |
| OOS-004 | UI redesign | Preserve current UI |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Export clients still call existing blob/text download helpers only after successful responses | source review and TypeScript check |
| AC-PRESERVE-002 | Existing export request bodies and loading-state cleanup remain unchanged | source review and TypeScript check |
| AC-PRESERVE-003 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-004 | Protected data, uploads, and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Export clients use `requireOkResponse` for failed response parsing | failing-then-passing source boundary test |
| AC-CHANGE-002 | Hand-written `response.json()` / `error.error || 'Export failed'` blocks are removed from export clients | failing-then-passing source boundary test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/export-client-response.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
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
| Protected data or upload file operation needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into export API behavior, file generation, filter semantics, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/export-client-response.test.ts` and the `requireOkResponse` changes in the four export clients |
| Data | N/A |
| Deploy | N/A |
