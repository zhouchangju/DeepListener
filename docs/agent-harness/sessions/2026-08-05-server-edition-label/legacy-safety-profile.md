# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-server-edition-label |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; inspect status only | no data operations | delete, overwrite, migrate, sync |
| DATA-SAFE-002 | `public/uploads/` | exists; inspect status only | no data operations | delete, overwrite, sync |
| DATA-SAFE-003 | `.env*` | not edited | no values read or edited | edit or print secrets |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Landing edition labeling | `src/app/landing-translations.ts`, `src/app/page.first-success.test.ts` | Desktop packaging, Server runtime, provider/API behavior |

## Preserve / Change / Verify

| ID | Requirement | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing landing CTA and no-key Demo copy remain intact | targeted test and full verify |
| AC-CHANGE-001 | Self-hosted card explicitly identifies Server edition as an advanced technical path | targeted translation test |

## Verify

| Command / Check | Required? | Expected Result |
|---|---|---|
| `node --import tsx --test src/app/page.first-success.test.ts` | yes | exits 0 |
| `npm run verify` | yes | exits 0 |
| `git diff --check` | yes | exits 0 |

## Stop Conditions

Do not change packaging claims, add runtime prerequisites, touch protected data,
or edit `.env*`.

## Rollback

Revert `landing-translations.ts`, its targeted assertion, and this session. No
data rollback is needed.
