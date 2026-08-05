# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-05-legacy-import |
| Domain | Deployment / data portability |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | T144 copy-first legacy import primitive | `src/lib/legacy-import.ts` + tests | explicit legacy source is copied and verified, migrated on staging, and activated only by explicit confirmation |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Active repository DB/media, UI/API wiring, schema changes, Electron packaging | requires separate authority and contracts |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Source DB/media are never mutated or deleted. | before/after SHA-256 in disposable fixtures |
| AC-PRESERVE-002 | No target replacement before confirmation. | stage/activation tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Add a reusable copy-first legacy import workflow that migrates the staged database and verifies media/database integrity. | 6+ targeted tests |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `public/videos/` | unchanged |
| DATA-SAFE-004 | `.env*` | not read/edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/legacy-import.test.ts` | targeted regression | yes | exits 0 |
| `npm run test:ci` | broader tests | yes | exits 0 with known Windows skips only |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |

## Stop Conditions

- Any attempt to touch active data, secrets, sync, UI/API, or schema work ends this sprint.
- If migration or integrity verification fails, leave source and target untouched and discard only staging.

## Rollback

| Area | Rollback |
|---|---|
| Code | revert the new service, test, and evidence files |
| Data | discard operation-owned staging; no active data rollback is needed |
