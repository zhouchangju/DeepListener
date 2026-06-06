# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-export-client-response-helper |
| Mode | Contract |
| Domain | Client export failure response handling |
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
| Export clients | `src/app/vault/ExportButtons.tsx`, `src/app/practice/[id]/PracticeClient.tsx`, `src/app/review/ReviewClient.tsx`, `src/app/library/LibraryManager.tsx`, `src/lib/export-client-response.test.ts` | Delegate failed export response checks to the shared helper |
| Shared client response tests | `src/lib/client-response.test.ts` | Preserve helper behavior |
| Docs | `docs/agent-harness/sessions/2026-06-06-export-client-response-helper/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted tests | export-client-response and client-response tests | exits 0 |
| lint/type/test/build | repo gates | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/export-client-response.test.ts` and the `requireOkResponse` changes in the four export clients |
| Data | N/A; no upload, schema, or data writes allowed |
| Deploy | N/A |
