# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-04-native-backup-dialog |
| Domain | Desktop / backup portability / data safety |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | native directory backup export/import | Desktop bridge/main/helper, `/api/backups`, Setup UI/tests | no-argument native dialogs, validated copy/staging, no active data replacement before existing explicit restore confirmation |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | ZIP or other archive format | current OpenSpec format is a transparent directory bundle; archive needs a separate format contract |
| OOS-002 | active data migration | protected paths remain untouched by this sprint |
| OOS-003 | platform release QA | requires clean native macOS/Windows installers |

## Preserve / Change / Verify

### Preserve

| ID | Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing `/api/backups` create/list/restore behavior remains | route tests |
| AC-PRESERVE-002 | Invalid/corrupt imports cannot become listed backups | import route tests |
| AC-PRESERVE-003 | Renderer never receives selected absolute paths | preload/main contract test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Export to user-selected directory with generated safe folder name | helper test |
| AC-CHANGE-002 | Import selected directory via operation-owned staging and validated promotion | API/helper tests |
| AC-CHANGE-003 | UI exposes export/import only when native bridge exists and retains Server fallback | component test |

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
| `node --test desktop/native-backup-contract.test.js` | copy/path boundary | yes | exits 0 |
| `node --import tsx --test src/app/api/backups/route.test.ts src/app/setup/DataSafetyActions.test.ts` | API/UI regression | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |
| `npm run test:ci` | broad regression | yes | no new failures |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert scoped Desktop/API/UI/helper files |
| Data | remove only `.deeplistener-backup-import-*` staging roots created by this operation |
| Deploy | no release artifact |
