# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-04-desktop-data-portability |
| Domain | Deployment / API / data safety |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | portable backup/restore service | `src/lib/backup-service.ts` and tests | manifest, checksums, safe staging, explicit conflict/activation |
| FEAT-002 | redacted diagnostics export | `src/lib/diagnostics.ts`, `/api/diagnostics`, tests | bounded JSON, no secrets/private paths/user content |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | live DB/media migration | protected data and no user approval |
| OOS-002 | native file dialogs, signing, updater | requires platform release environment |
| OOS-003 | real provider/network tests | requires user credentials and external cost approval |

## Preserve / Change / Verify

### Preserve

| ID | Existing Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | `/uploads` and `/videos` remain portable identifiers | media/runtime regression tests |
| AC-PRESERVE-002 | failed restore leaves the active target unchanged | restore failure and rollback tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | manifest-backed backup includes DB and required media metadata | disposable backup fixture |
| AC-CHANGE-002 | restore validates hashes and stages before activation | corrupt/conflict/stage tests |
| AC-CHANGE-003 | user-triggered diagnostics export is safe by default | redaction/API tests |

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
| `node --import tsx --test src/lib/backup-service.test.ts src/lib/diagnostics.test.ts src/app/api/diagnostics/route.test.ts` | targeted regression | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 with zero warnings |
| `npm run build` | production build | yes | exits 0 |
| `npm run test:ci` | broad regression | yes | no new failures |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/api/diagnostics` | request with an explicit disposable-root environment | JSON contains only redacted bounded diagnostics |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | stop and ask for explicit confirmation |
| `npm run sync` needed | stop; do not run |
| `.env*` edit needed | stop; ask user to edit |
| Restore target is not a disposable or explicitly confirmed root | stop |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert session files only |
| Data | remove disposable fixture roots; no active restore |
| Deploy | not applicable |
