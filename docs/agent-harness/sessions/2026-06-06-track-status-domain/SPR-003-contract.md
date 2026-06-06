# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-003 |
| Mode | Contract |
| Session | 2026-06-06-track-status-domain |
| Domain | Library track status domain |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Centralize track status type/fallback helpers | `src/lib/domain-constants.ts` | Track status strings from Prisma cross one domain boundary before display |
| FEAT-002 | Move TrackList status display/menu data to shared helpers | `src/app/library/TrackList.tsx` | Track status badge, toast, and menu order remain the same |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Prisma enum migration | Requires data migration and product rollback planning |
| OOS-002 | Changing status labels or workflow | This slice only consolidates configuration |
| OOS-003 | Library card visual redesign | Existing UI behavior should be preserved |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing known statuses and labels remain unchanged | domain constants tests |
| AC-PRESERVE-002 | Track patch schema accepts known statuses and rejects arbitrary statuses | API schema tests |
| AC-PRESERVE-003 | Protected data and secrets are untouched | protected-path git status check |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Add `TrackStatus`, `isTrackStatus`, `getTrackStatusDisplay`, and `TRACK_STATUS_OPTIONS` helpers | failing-then-passing domain constants test |
| AC-CHANGE-002 | Unknown persisted status strings fall back through the shared helper | failing-then-passing domain constants test |
| AC-CHANGE-003 | `TrackList` consumes shared status options instead of local casts/entries | source grep plus TypeScript |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/domain-constants.test.ts src/lib/api-schemas.test.ts src/app/library/track-actions.test.ts` | targeted regression | yes | exits 0 |
| `node scripts/run-node-tests.mjs` | broader tests | yes | exits 0 |
| `node node_modules/eslint/bin/eslint.js src scripts --max-warnings=0` | source-scoped lint | yes | exits 0 |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | type check | yes | exits 0 |
| `git status --short -- prisma/dev.db public/uploads '.env*'` | protected data check | yes | no output |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | N/A | Not run | Domain helper refactor; no visible UI change intended |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into Prisma migration | Stop and split a new adversarial contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/domain-constants.ts`, `src/lib/domain-constants.test.ts`, and `src/app/library/TrackList.tsx` |
| Data | N/A |
| Deploy | N/A |
