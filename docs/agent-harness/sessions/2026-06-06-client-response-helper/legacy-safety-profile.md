# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-client-response-helper |
| Mode | Contract |
| Domain | Client mutation response handling |
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
| Shared client response helper | `src/lib/client-response.ts`, `src/lib/client-response.test.ts` | Preserve `requireOkResponse` behavior while making it reusable |
| Library compatibility | `src/app/library/track-actions.ts`, `src/app/library/TrackList.tsx` | Keep old re-export compatible; direct app usage should prefer shared helper |
| Review mutation handling | `src/app/review/ReviewClient.tsx`, `src/app/review/ReviewClient.test.ts` | Delegate grade/archive response checks to shared helper |
| Docs | `docs/agent-harness/sessions/2026-06-06-client-response-helper/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted tests | client response, Library, Review boundary tests | exits 0 |
| lint/type/test | repo gates | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/client-response.ts`, `src/lib/client-response.test.ts`, `src/app/library/track-actions.ts`, `src/app/library/TrackList.tsx`, `src/app/review/ReviewClient.tsx`, and `src/app/review/ReviewClient.test.ts` |
| Data | N/A; no schema or data writes allowed |
| Deploy | N/A |
