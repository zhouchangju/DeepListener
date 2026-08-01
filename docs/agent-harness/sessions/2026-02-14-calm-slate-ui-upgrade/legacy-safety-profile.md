# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | YYYY-MM-DD-short-name |
| Mode | Contract / Adversarial |
| Owner | AI Agent / Human |
| Date | YYYY-MM-DD |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | [exists / missing / unknown] | read, inspect, backup with explicit note | delete, overwrite, migrate, sync without confirmation |
| DATA-SAFE-002 | `public/uploads/` | [exists / missing / unknown] | read, inspect | delete, overwrite, sync without confirmation |
| DATA-SAFE-003 | `.env*` | [exists / unknown] | read names only if needed; do not expose values | edit or print secrets |

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
| [domain] | [paths] | [paths/domains not touched] |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | [behavior that must remain true] | [targeted test / browser check / code inspection] |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | [requested improvement] | [targeted test / browser check / code inspection] |

### Verify

| Command / Check | Scope | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test <paths>` | touched domain | yes | exits 0 |
| `npm run lint` | repo | important changes | exits 0 |
| `npm run build` | repo | release/deploy-sensitive changes | exits 0 |

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
