# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-04-native-export-dialog |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | absent in current workspace | read-only metadata check | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | present, no Git changes | read-only metadata check | delete, overwrite, sync |
| DATA-SAFE-003 | `public/videos/` | present, no Git changes | read-only metadata check | delete, overwrite, sync |
| DATA-SAFE-004 | `.env*` | no Git changes | names/status only | edit or print values |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Electron renderer is sandboxed and uses a narrow preload bridge | `desktop/main.js`, `desktop/preload.js` | No `fs`/shell/`ipcRenderer` passthrough |
| RUN-002 | Diagnostics are an allow-listed JSON snapshot | `src/lib/diagnostics.ts`, `/api/diagnostics` | Renderer may pass bounded JSON only |
| RUN-003 | User-selected export path is chosen by Electron main process | Electron `dialog.showSaveDialog` contract | Renderer never receives arbitrary filesystem APIs |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Native diagnostics export | `desktop/main.js`, `desktop/preload.js`, `src/app/setup/DataSafetyActions.tsx`, focused tests | backup archive/import, provider calls, signing, updater, schema/data changes |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Browser/server deployments keep the existing `/api/diagnostics` download fallback | DataSafetyActions test |
| AC-PRESERVE-002 | Electron never exposes arbitrary filesystem or raw IPC access | preload/main source contract tests |
| AC-PRESERVE-003 | Diagnostics content remains bounded and redacted before persistence | diagnostics tests plus IPC payload limit |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Electron offers a native save dialog with a suggested JSON name/location | main/preload contract test |
| AC-CHANGE-002 | Cancel returns a safe non-error result and does not write a file | IPC handler test/source inspection |
| AC-CHANGE-003 | Unsupported/oversized payloads are rejected before filesystem write | focused boundary tests |

## Stop Conditions

Stop before touching protected data, `.env*`, `npm run sync`, or backup restore semantics.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert only desktop bridge/main, Setup component, and focused tests | no protected data writes |
| Data | N/A | test fixtures use disposable roots |
| Deployment | defer packaging changes | no release artifact produced |
