# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-04-native-export-dialog |
| Domain | Desktop / data safety / diagnostics |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | native diagnostics export | `desktop/main.js`, `desktop/preload.js`, `src/app/setup/DataSafetyActions.tsx`, tests | Electron uses a validated native save dialog; Server keeps browser download fallback |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | backup archive/import dialogs | requires a separate portable archive contract |
| OOS-002 | provider/network calls | no live credentials or external calls |
| OOS-003 | signing/notarization | native release environment required |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Browser download remains available outside Electron | component test |
| AC-PRESERVE-002 | Renderer has no arbitrary path/fs API | preload contract test |
| AC-PRESERVE-003 | secrets/private paths cannot be written through this bridge | main handler boundary test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Add `saveDiagnostics` bridge with bounded payload and suggested filename | focused tests |
| AC-CHANGE-002 | Native Save dialog supports cancel and JSON filter | focused tests/source contract |

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
| `node --test desktop/native-export-contract.test.js` | IPC/preload contract | yes | exits 0 |
| `node --import tsx --test src/app/setup/DataSafetyActions.test.ts` | UI fallback/bridge contract | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |
| `npm run test:ci` | regression | yes | no new failures |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert the scoped bridge/main/UI/test files |
| Data | no protected data mutation |
| Deploy | no release artifact |
