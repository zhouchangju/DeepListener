# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-04-ordinary-first-success |
| Mode | Adversarial (startup/readiness + demo journey); Contract (onboarding UI) |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unknown; not inspected for this UI slice | no access | delete, overwrite, migrate, sync without confirmation |
| DATA-SAFE-002 | `public/uploads/` | exists or may contain user media | no access | delete, overwrite, sync without confirmation |
| DATA-SAFE-003 | `.env*` | exists/unknown | do not read values | edit or print secrets |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Next.js App Router under `src/app` | `AGENTS.md`, tree | Route placement |
| RUN-002 | SQLite URL resolves relative to `prisma/schema.prisma` | `AGENTS.md` | Active DB usually `prisma/dev.db` |
| RUN-003 | `/DeepListener` basePath may matter for deployment | prior deployment work / config | Asset and upload URLs |
| RUN-004 | `npm run sync` writes uploads and DB remotely | `package.json` | High-risk remote overwrite |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| First-session onboarding and readiness UX | `src/components/onboarding/**`, `src/components/app-shell/AppShell.tsx`, `src/app/setup/**`, `src/lib/setup-readiness.ts`, targeted tests | Prisma schema/migrations, `prisma/dev.db`, upload/transcription pipeline, Demo audio replacement, Desktop packaging/signing |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing onboarding can be skipped/replayed and existing routes keep their URLs | `src/components/onboarding/OnboardingGuide.test.ts`, browser smoke |
| AC-PRESERVE-002 | Provider secrets remain write-only/redacted and readiness does not probe providers | setup/provider tests and source inspection |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Onboarding primary actions are keyboard-accessible and do not use a click-catcher that blocks targets | targeted test + browser check |
| AC-CHANGE-002 | Known blocked readiness routes provide a valid recovery destination instead of generic retry | setup/readiness tests; route integration follow-up |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/onboarding/OnboardingGuide.test.ts src/app/onboarding.test.ts` | touched onboarding domain | yes | exits 0 |
| `npm run lint` | repo | required before claiming slice complete | exits 0 |
| `npm run build` | repo | required before claiming slice complete | exits 0 |

## Stop Conditions

Stop and ask the user before:

- Deleting, overwriting, migrating, or syncing `prisma/dev.db`
- Deleting, overwriting, or syncing `public/uploads/`
- Running `npm run sync`
- Editing `.env*` or secrets
- Weakening lint, test, type, build, or safety rules
- Expanding the sprint into unrelated domains

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert commit / restore touched files | [notes] |
| Data | restore from explicit backup only | [notes] |
| Deployment | revert config / disable deploy change | [notes] |
