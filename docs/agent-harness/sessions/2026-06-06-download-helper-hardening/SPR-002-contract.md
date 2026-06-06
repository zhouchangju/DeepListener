# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-002 |
| Mode | Contract |
| Session | 2026-06-06-download-helper-hardening |
| Domain | Client download helper |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Harden client-side export filename parsing | `src/lib/client-download.ts` | quoted, unquoted, and RFC 5987 `filename*=` response filenames resolve safely |
| FEAT-002 | Verify browser download mechanics | `src/lib/client-download.test.ts` | download helper creates a temporary anchor, clicks it, removes it, and revokes the object URL |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | API export route behavior | Already covered by existing export route tests; no response format change required |
| OOS-002 | Prisma schema, migrations, or local data | Not needed for a client helper hardening slice |
| OOS-003 | Visual UI changes | Existing export buttons and flows should keep their current behavior |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing quoted `Content-Disposition` filenames continue to work | targeted helper test |
| AC-PRESERVE-002 | Existing callers still receive downloaded blobs/text through the same helper API | source grep plus repo tests |
| AC-PRESERVE-003 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Support unquoted `filename=` response values | failing-then-passing helper test |
| AC-CHANGE-002 | Support encoded `filename*=` response values | failing-then-passing helper test |
| AC-CHANGE-003 | Reject control characters in response filenames | failing-then-passing helper test |
| AC-CHANGE-004 | Test temporary link lifecycle for blob downloads | helper behavior test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/client-download.test.ts` | targeted regression | yes | exits 0 |
| `node scripts/run-node-tests.mjs` | broader tests | yes | exits 0 |
| `node node_modules/eslint/bin/eslint.js src scripts --max-warnings=0` | source-scoped lint | yes | exits 0 |
| `git status --short -- prisma/dev.db public/uploads '.env*'` | protected data check | yes | no output |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | N/A | Not run | Pure helper hardening; no visible UI change |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into API route behavior | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/client-download.ts` and `src/lib/client-download.test.ts` |
| Data | N/A |
| Deploy | N/A |
