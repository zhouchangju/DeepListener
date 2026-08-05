# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-002 |
| Mode | Adversarial |
| Session | 2026-08-04-desktop-data-portability |
| Domain | Desktop diagnostics / data safety |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-003 | bounded Desktop log persistence | `desktop/bounded-log.js`, `desktop/main.js`, focused tests | redacted logs are written under the explicit data root, rotate by byte limit, retain a bounded number of files |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | provider/network logs | no live credentials or external calls |
| OOS-002 | active data/media migration | protected paths remain untouched |
| OOS-003 | platform packaging/signing | requires native release environment |

## Preserve / Change / Verify

### Preserve

| ID | Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | main-process redaction runs before persistence | source contract and logger tests |
| AC-PRESERVE-002 | logs remain bounded and do not affect startup if unwritable | logger failure-path tests/source inspection |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | write `desktop.log` beneath `<data-root>/logs` | disposable-root logger test |
| AC-CHANGE-002 | rotate at a configured byte limit and retain finite history | rotation test with oversized entries |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `public/videos/` | unchanged |
| DATA-SAFE-004 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --test desktop/bounded-log.test.js` | logger focused tests | yes | exits 0 |
| `node --import tsx --test src/lib/desktop-startup-contract.test.ts src/lib/diagnostics.test.ts` | integration contracts | yes | exits 0 |
| `npm run lint` | lint | yes | zero warnings/errors |
| `npm run build` | production build | yes | exits 0 |
| `npm run test:ci` | broad regression | yes | no new failures |

## Stop Conditions

- Never write to the repository or protected media directories as a log target.
- Never persist raw messages before the main-process redaction function.
- If the log directory is unwritable, skip file persistence and preserve stdout/stderr startup behavior.

## Rollback

| Area | Rollback |
|---|---|
| Code | revert only `desktop/bounded-log.js`, `desktop/main.js`, and focused tests |
| Data | disposable logger roots are removed by tests |
| Deploy | no release artifact is produced |
