# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-download-helper-hardening |
| Mode | Contract |
| Domain | Client download helper |
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
| Download helper | `src/lib/client-download.ts`, `src/lib/client-download.test.ts` | Preserve current browser download behavior while improving filename parsing and tests |
| Docs | `docs/agent-harness/sessions/2026-06-06-download-helper-hardening/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted test | `src/lib/client-download.test.ts` | exits 0 |
| repo tests | `scripts/run-node-tests.mjs` | exits 0 |
| lint | `src scripts` | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/client-download.ts` and `src/lib/client-download.test.ts` |
| Data | N/A; no data writes allowed |
| Deploy | N/A |
