# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-009 |
| Mode | Contract |
| Session | 2026-06-06-autosaved-note-response-helper |
| Domain | Autosaved rich text note response handling |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Forward autosave errors from the shared hook to note editor consumers | `src/components/feature/rich-text/useAutosavedRichTextNote.ts` | Save timing, last-saved tracking, and contentEditable sync remain unchanged |
| FEAT-002 | Wire track note autosave response checks to shared helper | `src/components/feature/NoteEditor.tsx` | Existing PATCH body and success callback stay the same; failed responses preserve parsed server messages |
| FEAT-003 | Wire review note autosave response checks to shared helper | `src/components/feature/ReviewNoteEditor.tsx` | Existing PATCH body and success callback stay the same; failed responses preserve parsed server messages |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Track or Vault API route behavior | This slice only changes client response parsing |
| OOS-002 | Rich text toolbar or formatting commands | Preserve editor UI and command model |
| OOS-003 | Autosave debounce timing | Preserve existing save cadence |
| OOS-004 | ContentEditable synchronization | Existing guard tests cover unchanged boundary |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Rich text editors still delegate toolbar and DOM sync to shared hooks | existing consolidation and contentEditable tests |
| AC-PRESERVE-002 | Shared response helper behavior remains intact | `src/lib/client-response.test.ts` |
| AC-PRESERVE-003 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Autosave hook forwards save errors to consumers | failing-then-passing boundary test |
| AC-CHANGE-002 | Track note autosave uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-003 | Review note autosave uses `requireOkResponse` | failing-then-passing boundary test |
| AC-CHANGE-004 | Parsed `Error.message` remains visible in note save toasts | failing-then-passing boundary test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/feature/rich-text-consolidation.test.ts src/components/feature/contentEditable-sync.test.ts src/lib/client-response.test.ts` | targeted regression | yes | exits 0 |
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
| Sprint expands into API behavior, debounce timing, editor formatting, or UI redesign | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/components/feature/rich-text/useAutosavedRichTextNote.ts`, `src/components/feature/NoteEditor.tsx`, `src/components/feature/ReviewNoteEditor.tsx`, and `src/components/feature/rich-text-consolidation.test.ts` |
| Data | N/A |
| Deploy | N/A |
