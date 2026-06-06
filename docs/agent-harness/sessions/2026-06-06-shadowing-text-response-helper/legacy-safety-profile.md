# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-shadowing-text-response-helper |
| Mode | Contract |
| Domain | Shadowing sentence text client response handling |
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
| Shadowing text save | `src/components/feature/ShadowingConsole.tsx`, `src/components/feature/ShadowingConsole.test.ts` | Delegate failed text-save response checks to the shared helper; keep touched Shadowing state resets lint-clean |
| Shared client response tests | `src/lib/client-response.test.ts` | Preserve helper behavior |
| Docs | `docs/agent-harness/sessions/2026-06-06-shadowing-text-response-helper/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted tests | ShadowingConsole and client-response tests | exits 0 |
| lint/type/test/build | repo gates | exits 0 |
| single-file lint | `src/components/feature/ShadowingConsole.tsx` | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/components/feature/ShadowingConsole.tsx` and the new assertions in `src/components/feature/ShadowingConsole.test.ts` |
| Data | N/A; no upload, schema, or data writes allowed |
| Deploy | N/A |
