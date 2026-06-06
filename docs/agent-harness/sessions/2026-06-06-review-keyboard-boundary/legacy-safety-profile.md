# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-review-keyboard-boundary |
| Mode | Contract |
| Domain | Review keyboard shortcuts |
| Date | 2026-06-06 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-001 | `prisma/dev.db` | protected local study data | none | any edit, migration, delete, overwrite, or sync |
| DATA-002 | `public/uploads/` | protected local audio uploads | none | any delete, overwrite, or sync |
| DATA-003 | `.env*` | protected local secrets/config | none | any edit |
| DATA-004 | `npm run sync` | remote backup writer | none | command needed |

## Allowed Surface

| Area | Paths | Notes |
|---|---|---|
| Review keyboard shortcuts | `src/app/review/review-keyboard.ts`, `src/app/review/review-keyboard.test.ts`, `src/app/review/ReviewClient.tsx` | Extract key-to-action rules without changing shortcut semantics |
| Docs | `docs/agent-harness/sessions/2026-06-06-review-keyboard-boundary/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted tests | Review keyboard, queue, and component boundary tests | exits 0 |
| source grep | ReviewClient keyboard handling | component delegates action mapping to helper |
| lint/type/test | repo gates | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/app/review/review-keyboard.ts`, `src/app/review/review-keyboard.test.ts`, and `src/app/review/ReviewClient.tsx` |
| Data | N/A; no schema or data writes allowed |
| Deploy | N/A |
