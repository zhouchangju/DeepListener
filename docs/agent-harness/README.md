# DeepListener Optimization Harness

This harness is for improving DeepListener as an existing, lived-in project. The goal is not to redesign freely. The goal is to make scoped improvements while preserving user data, audio files, study history, deployment assumptions, and existing workflows.

Use this for refactors, performance work, migrations, UI workflow changes, deployment/basePath work, sync changes, Prisma/data changes, audio export/transcription changes, and quality-gate hardening.

## Default Stance

DeepListener is a zero-data-loss project by default.

- Do not delete, overwrite, migrate, or sync `prisma/dev.db` without explicit user confirmation.
- Do not delete, overwrite, or sync `public/uploads/` without explicit user confirmation.
- Do not edit `.env*`, secrets, credential files, or local-only config.
- Do not weaken lint, test, type, build, deploy, or data-safety rules to make a change pass.
- Treat `npm run sync` as high risk because it can overwrite remote uploads and database state.

## Modes

| Mode | Use When | Required Artifacts |
|---|---|---|
| Lite | Single-file, low-risk UI or text change with obvious verification | Verification notes in final response |
| Contract | Shadowing, Vault, Review, Dashboard, API, audio, or quality-gate changes inside one domain | Safety profile, sprint contract, evaluator report |
| Adversarial | Prisma, local data, uploads, sync, deployment, permissions, migrations, or release-critical work | Contract mode plus explicit data-safety and rollback evidence |

Default to Contract mode for real code changes. Use Adversarial mode whenever a command or edit can affect persisted data, uploaded audio, deployment routing, or remote sync state.

## Workflow

1. Read `AGENTS.md`, this harness, and relevant docs under `docs/`.
2. Create a session directory:

```text
docs/agent-harness/sessions/YYYY-MM-DD-short-name/
```

3. Copy and fill:

```bash
cp docs/agent-harness/templates/legacy-safety-profile.md docs/agent-harness/sessions/YYYY-MM-DD-short-name/legacy-safety-profile.md
cp docs/agent-harness/templates/sprint-contract.md docs/agent-harness/sessions/YYYY-MM-DD-short-name/SPR-001-contract.md
cp docs/agent-harness/templates/evaluator-report.md docs/agent-harness/sessions/YYYY-MM-DD-short-name/SPR-001-evaluator-report.md
```

4. Implement only inside the contract boundary.
5. Run targeted verification first, then broader gates when risk warrants it.
6. Fill the evaluator report before calling the feature accepted.
7. Write handoff notes if the sprint blocks, spans sessions, or is release-relevant.

## Domain Boundaries

Current `next.config.ts` does not set `basePath` or `assetPrefix`. If a deployment sprint reintroduces `/DeepListener` subpath serving, verify the runtime config first and update architecture/maintenance docs with the same change.

| Domain | Primary Files | Contract Rule |
|---|---|---|
| Shadowing | `src/components/feature/ShadowingConsole.tsx`, shadowing helpers/tests | Keep enhancements inside the existing modal/workflow unless the contract explicitly expands scope. |
| Vault | `src/app/vault/**` | Preserve server-side pagination, lazy note loading, filters, and Play All semantics. |
| Review | `src/app/review/**` | Preserve review queue semantics and audio behavior. |
| Dashboard | `src/app/dashboard/**` | Preserve analytics calculations and chart expectations. |
| API contracts | `src/app/api/**`, `src/lib/api-*.ts` | Validate request/response behavior with targeted tests. |
| Audio export/transcription | `src/lib/audio-utils.ts`, `src/lib/transcription/**`, related scripts | Verify failure paths separately from UI behavior. |
| Deployment | `next.config.ts`, manifest/upload routes, `npm run sync` | Preserve `/DeepListener` basePath and upload/range behavior when relevant. |

## Protected Data

| Path / Resource | Rule |
|---|---|
| `prisma/dev.db` | Active local SQLite data. Do not delete, overwrite, migrate, or sync without explicit confirmation. |
| `dev.db` | Check whether it is legacy or active before touching. |
| `public/uploads/` | User audio uploads. Do not delete, overwrite, or sync without explicit confirmation. |
| `.env*` | Secrets/local config. Do not edit. Ask the user to change values. |

Note: `DATABASE_URL="file:./dev.db"` resolves relative to `prisma/schema.prisma`, so the active SQLite file is usually `prisma/dev.db`.

## Verification Commands

| Command | Use |
|---|---|
| `node --import tsx --test <paths>` | Targeted tests for touched files. |
| `npm run test:ci` | Repo test runner via `scripts/run-node-tests.mjs`. |
| `npm run lint` | ESLint across the repo. |
| `npm run build` | Production build before major merges or deployment-sensitive changes. |
| `npx prisma migrate dev` | Only for explicit Prisma schema changes, after data safety is addressed. |

## Known Hazards

- `npm run sync` uses `rsync` for uploads and database. Treat it as high-risk.
- Local environment/tooling failures can be unrelated to the patch. Separate product regressions from SWC, Prisma, npm, or code-signing issues.
- zsh paths containing brackets need quoting.
- Generated `.worktrees/**/.next` output should not be treated as source.
- Avoid broad formatting, renames, or cleanup outside the sprint domain.

## Acceptance Rule

A DeepListener optimization is accepted only when:

- The requested improvement is verified.
- Preserved behavior is verified.
- Protected data status is known and safe.
- Required targeted tests ran or are documented as skipped with reason.
- Rollback path is documented for risky changes.
- The evaluator report has no open blocker or must-fix findings.
