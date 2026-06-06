# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-track-status-domain |
| Mode | Contract |
| Domain | Library track status domain |
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
| Track status domain constants | `src/lib/domain-constants.ts`, `src/lib/domain-constants.test.ts` | Add typed status helpers without changing persisted values |
| Library UI usage | `src/app/library/TrackList.tsx` | Consume centralized helpers and keep existing menu/status behavior |
| Docs | `docs/agent-harness/sessions/2026-06-06-track-status-domain/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted tests | domain constants and API schema tests | exits 0 |
| source grep | TrackList status display usage | no local casts or direct entries iteration |
| lint/type/test | repo gates | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/lib/domain-constants.ts`, `src/lib/domain-constants.test.ts`, and `src/app/library/TrackList.tsx` |
| Data | N/A; no schema or data writes allowed |
| Deploy | N/A |
