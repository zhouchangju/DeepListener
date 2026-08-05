# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-practice-export-no-sentences |
| Domain | Audio Export API |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Fix Practice export with uncaptured Demo sentences | `src/app/api/audio/export/route.ts` | `{type:"track", trackId}` exports all ordered sentences on the track |
| FEAT-002 | Support bundled Demo source safely | `src/lib/export-file-policy.ts` | `/demo/...` resolves only beneath `public/demo` |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Change `all`, `due`, or `filtered` selection semantics | Preserve existing Vault/Review behavior |
| OOS-002 | Database migrations or user media changes | Not needed for the fix |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Existing ReviewItem-based export modes remain unchanged | targeted tests + full suite |
| AC-PRESERVE-002 | Path traversal remains rejected | policy tests |
| AC-CHANGE-001 | Demo track exports HTTP 200 audio/mpeg with nonzero body | disposable SQLite + FFmpeg smoke |

## Data Safety

| Path / Resource | Required Status |
|---|---|
| `prisma/dev.db` | unchanged |
| `public/uploads/` | unchanged |
| `.env*` | not edited |

## Commands

| Command | Expected Result |
|---|---|
| `node --import tsx --test src/lib/export-file-policy.test.ts src/app/api/audio/export/route.test.ts` | exits 0 |
| `npm run lint` | exits 0 |
| `npm run test:ci` | exits 0 |
| `npm run build` | exits 0 |

## Rollback

Revert the scoped route/policy/test/docs changes. No production database rollback is required.
