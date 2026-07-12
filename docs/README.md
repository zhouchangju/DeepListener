# DeepListener Documentation Map

This map is the human-friendly entry point for project documentation. It separates current source-of-truth docs from historical plans, review notes, and agent-specific context.

## Start Here

| Need | Read |
| --- | --- |
| Run the app, configure providers, or understand the user workflow | [Project README](../README.md) |
| Check release history and long-term iteration milestones | [Changelog](../CHANGELOG.md) |
| Understand current routes, data flow, API surfaces, and safety boundaries | [Current Architecture](./architecture.md) |
| Understand implemented product behavior and module boundaries | [Product Requirements](./requirement.md) |
| Maintain transcription, audio/video imports, exports, database files, or backup sync | [Maintenance Manual](./maintenance.md) |
| Work on the SRS queue or FSRS behavior | [Review System](./review-system.md) |
| Work on Symphony automation | [Symphony Guide](./symphony.md) |
| Run optimization/refactor work without risking local data | [Agent Harness](./agent-harness/README.md) |

## Current Implementation Docs

- [architecture.md](./architecture.md): current Next.js App Router structure, API families, data model, upload/export flow, and verification gates.
- [requirement.md](./requirement.md): implemented product modules, not an aspirational roadmap.
- [maintenance.md](./maintenance.md): operational notes for transcription providers, SQLite, uploads, exports, and backups.
- [review-system.md](./review-system.md): FSRS scheduling, Again/Hard short-interval relearning, review queue semantics, and review UI behavior.
- [symphony.md](./symphony.md): local Symphony runner/orchestrator usage and boundaries.
- [../CHANGELOG.md](../CHANGELOG.md): versioned history reconstructed from git commits; update it when user-visible behavior, runtime contracts, or governance process changes.

## Planning And Review Archives

These docs are useful as decision history. Treat them as historical context unless a current implementation doc above says the behavior is still true.

- [plans/](./plans/): older feature designs and implementation plans.
- [superpowers/plans/](./superpowers/plans/): agent-oriented execution plans and completed cleanup notes.
- [review/](./review/): codebase audits, engineering-governance plans, and quality reviews.
- [history/](./history/): moved historical implementation notes that should not live at the repository root.
- [2026-04-04-project-roadmap.md](./2026-04-04-project-roadmap.md): value-first roadmap.
- [2026-04-04-project-value-and-optimization-analysis.md](./2026-04-04-project-value-and-optimization-analysis.md): product value and optimization analysis.

## Specialized Notes

- [OMSCS/](./OMSCS/): application/project-positioning research, not runtime documentation.
- [solving-node-proxy-timeout.md](./solving-node-proxy-timeout.md): background note on Node.js proxy behavior.
- [dev-log.md](./dev-log.md): chronological development log; use current docs for present behavior.
- [todo.md](./todo.md): lightweight idea/backlog list; it is not the execution source of truth.

## Agent Context Files

- [AGENTS.md](../AGENTS.md): primary project memory and operating rules for Codex.
- [GEMINI.md](../GEMINI.md): Gemini-oriented context.
- [CLAUDE.md](../CLAUDE.md): Claude-oriented context; do not add new Codex-only rules there.
- [WORKFLOW.md](../WORKFLOW.md): Symphony workflow configuration plus agent prompt.

## Documentation Rules

- Put current user/developer docs under `docs/`, not the repository root.
- Keep root files limited to entry points such as `README.md`, `AGENTS.md`, agent context files, `CHANGELOG.md`, and workflow config.
- When behavior changes, update the current source-of-truth doc first, then add a short changelog or history note if the old decision context matters.
- Do not rewrite historical plans to pretend they were implemented exactly. Add a current-status note or link to the source-of-truth doc instead.
