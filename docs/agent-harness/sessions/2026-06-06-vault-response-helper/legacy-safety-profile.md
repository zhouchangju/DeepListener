# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-vault-response-helper |
| Mode | Contract |
| Domain | Vault client mutation response handling |
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
| Vault client mutations | `src/app/vault/VaultListClient.tsx`, `src/app/vault/VaultListClient.test.ts` | Delegate delete/archive response checks to shared helper |
| Shared client response tests | `src/lib/client-response.test.ts` | Preserve helper behavior |
| Docs | `docs/agent-harness/sessions/2026-06-06-vault-response-helper/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted tests | VaultListClient and client-response tests | exits 0 |
| lint/type/test | repo gates | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/app/vault/VaultListClient.tsx` and `src/app/vault/VaultListClient.test.ts` |
| Data | N/A; no schema or data writes allowed |
| Deploy | N/A |
