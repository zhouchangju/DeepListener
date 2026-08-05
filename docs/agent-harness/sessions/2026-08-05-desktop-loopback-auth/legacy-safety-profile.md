# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-desktop-loopback-auth |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | present/unknown; not opened or changed | inspect status only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | present with `.gitkeep`; not changed | inspect status only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not edited or printed | names/status only | edit or expose values |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Desktop starts a standalone Next service on `127.0.0.1` | `desktop/main.js` | all renderer/API requests share one local origin |
| RUN-002 | Desktop owns a fresh random token per process launch | `desktop/main.js` | token is not persisted or recoverable after restart |
| RUN-003 | Server/dev layouts must remain usable without the token | explicit opt-in flag in `src/lib/desktop-launch-auth.ts` | no accidental lockout outside Desktop |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Desktop loopback authorization | `src/proxy.ts`, `src/lib/desktop-launch-auth.ts`, `desktop/main.js`, focused tests | provider UX, Prisma schema/data, signing, packaging, real OS E2E |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Server/dev requests remain pass-through when Desktop auth is not explicitly enabled | proxy contract test |
| AC-PRESERVE-002 | Renderer cannot read the token through preload | Electron contract test |
| AC-PRESERVE-003 | Health, diagnostics, and native backup calls still reach the service | targeted tests/source contract |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Desktop standalone service rejects requests without the current launch token | proxy behavior test |
| AC-CHANGE-002 | Electron injects the token only for its own loopback origin and internal main-process requests | Electron contract test |
| AC-CHANGE-003 | Unauthorized responses are body-less, non-cacheable `401` responses | proxy behavior test |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `npm run lint` | repository | yes | exits 0 |
| `npm run build` | standalone/proxy integration | yes | exits 0 |
| `node --import tsx --test ...` | auth + Desktop contracts | yes | exits 0 |
| `npm run test:ci` | repository regressions | yes | exits 0; only documented Windows capability skips |
| `git diff --check` | touched files | yes | exits 0 |

## Stop Conditions

Stop before touching `prisma/dev.db`, `public/uploads/`, `.env*`, or running `npm run sync`.

## Rollback

Code rollback is limited to the touched auth/proxy/main/test/docs files. No protected data or deployment artifact is modified by this session.
