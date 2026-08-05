# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-04-native-backup-dialog |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | absent | read-only metadata check | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | present, no Git changes | read-only metadata check | delete, overwrite, sync |
| DATA-SAFE-003 | `public/videos/` | present, no Git changes | read-only metadata check | delete, overwrite, sync |
| DATA-SAFE-004 | `.env*` | no Git changes | status/names only | edit or print values |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Native backup directory export/import | `desktop/main.js`, `desktop/preload.js`, `desktop/native-backup.js`, `/api/backups`, Setup UI, focused tests | ZIP/archive format, schema migration, provider calls, signing/notarization, uninstall behavior |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing local backup creation and restore staging remain API-compatible | backup route/service tests |
| AC-PRESERVE-002 | External selection never replaces active data directly | import staging/activation tests |
| AC-PRESERVE-003 | No renderer path/fs API is exposed | Desktop contract tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Native export creates a validated copy under a user-selected directory | disposable-root copy/hash test |
| AC-CHANGE-002 | Native import copies a selected bundle into operation-owned staging, then API validates/promotes it | API route + failure-path tests |
| AC-CHANGE-003 | Cancel, invalid bundle, existing destination, and Unicode directory names are safe | focused tests/source contract |

## Stop Conditions

Stop before touching active DB/media, changing schema, running sync, editing secrets, or silently deleting an external/user-selected directory.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert scoped Desktop/API/UI/helper files | no active data replacement during export/import |
| Data | remove only operation-owned incoming staging; restore uses existing sibling rollback root | never delete active root |
| Deployment | no release artifact | packaging is separately gated |
