# AI Harness Status

Last updated: 2026-06-12

## Project

DeepListener — Next.js 16 App Router English listening practice platform.

## Commands

| Command | Use |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:ci` | All tests |
| `node --import tsx --test <paths>` | Targeted tests |
| `npx prisma migrate dev` | Schema migrations |
| `npm run sync` | Remote backup (HIGH RISK) |

## Project Skills

| Skill | Purpose |
|---|---|
| `deeplistener-router` | Route common tasks to correct local skill or docs |
| `deeplistener-onboarding` | Read project map, commands, architecture, risks |
| `deeplistener-dev-diagnose` | Diagnose startup, dependency, command failures |
| `deeplistener-quality-gate` | Run and interpret lint/typecheck/test/build gates |
| `deeplistener-audit-followup` | Turn audit findings into verifiable remediation tasks |

## Modes

| Mode | When to Use |
|---|---|
| Lite | Single-file, low-risk UI/text change |
| Contract | Feature work within one domain |
| Adversarial | Data, uploads, sync, deployment, migrations |

## Protected Data

- `prisma/dev.db` — active SQLite data
- `public/uploads/` — user audio files
- `.env*` — secrets and local config

## Next Actions

- Review and update this status as harness matures
- Add hooks templates under `.agents/hooks/` when ready
- Track open questions in `docs/ai-harness/open-questions.md`
