# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-30-dark-mode |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-06-30 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists | none needed | delete, overwrite, migrate, sync without confirmation |
| DATA-SAFE-002 | `public/uploads/` | exists | none needed | delete, overwrite, sync without confirmation |
| DATA-SAFE-003 | `.env*` | unknown | none needed | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md`, source tree | Theme provider belongs in `src/app/layout.tsx` |
| RUN-002 | Theme switching uses installed `next-themes` | `package.json`, Context7 docs | Use class attribute and system default |
| RUN-003 | Current light UI is the preserved default style | user request | Dark mode should add a parallel style, not redesign light mode |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Global UI theme | `src/app/layout.tsx`, `src/app/globals.css`, `src/components/theme/**`, UI/routes/components with hard-coded surfaces | Prisma schema/data, uploads, sync, transcription/audio processing behavior |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing routes and client workflows still compile and test | targeted tests, lint, build |
| AC-PRESERVE-002 | Protected data is untouched | git status for `prisma/dev.db`, `public/uploads`, `.env*` |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | App follows system theme by default | provider source and test |
| AC-CHANGE-002 | Top-right icon toggles light/dark | layout/toggle source and test |
| AC-CHANGE-003 | Main app surfaces have dark styling | source review, browser check |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test ...` | theme, shadowing, review, vault, library | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 |
| `npm run build` | repo | yes | exits 0 |
| `npm run test:ci` | repo | yes | exits 0 |

## Stop Conditions

Stop and ask the user before:

- Deleting, overwriting, migrating, or syncing `prisma/dev.db`
- Deleting, overwriting, or syncing `public/uploads/`
- Running `npm run sync`
- Editing `.env*` or secrets
- Weakening lint, test, type, build, or safety rules
- Expanding into data or deployment behavior changes

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert changed theme/layout/component files | no data changes expected |
| Data | N/A | no data writes or migrations in scope |
| Deployment | N/A | no deployment config changes in scope |
