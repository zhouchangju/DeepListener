# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-library-no-provider-guidance |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | existing / protected | status inspection only | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | existing / protected | status inspection only | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | protected | do not read values or edit | any edit or secret output |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Library import guidance | `src/app/library/UploadButton.tsx`, `src/app/library/UploadButton.test.ts`, `messages/en.json`, `messages/zh-CN.json`, first-session language evidence | upload API, import state machine, Prisma schema, provider adapters, Desktop packaging |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Single-file streaming upload and recovery behavior remain unchanged. | `UploadButton.test.ts`, existing import-job tests |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | When no transcription service is configured, the Library explains the subtitle/service choice and links to real subtitle-import and setup destinations. | source/structure test in both locales; browser smoke if available |

## Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/library/UploadButton.test.ts src/i18n/first-session-language.test.ts` | touched UI/copy | yes | exits 0 |
| `npm run lint` | repo | yes | exits 0 |
| `npm run build` | repo | yes | exits 0 |

## Stop Conditions

- Do not touch active data, media, secrets, migrations, or sync.
- Do not change the import API or provider behavior in this sprint.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code/copy | restore the four scoped files | no data mutation |
