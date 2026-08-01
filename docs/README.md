# DeepListener Documentation Map

This map is the human-friendly entry point for project documentation. It separates documents by **audience and authority**, so a new reader can tell at a glance what is current product truth versus historical decision context.

> **Reading order for a new user:** start with the [Project README](../README.md) (install + first session), then [Architecture](./architecture.md) if you want to understand the internals. Treat everything in [Tier 3 — AI-Assisted Development Logs](#tier-3--ai-assisted-development-logs-historical) as decision history, not present-tense behavior.

---

## Tier 1 — For Users & Operators (source of truth)

These describe **how the product works today**. When behavior changes, these docs are updated first.

| Need | Read |
| --- | --- |
| Install, configure providers, run a first session | [Project README](../README.md) |
| Support scope, self-check checklist, how to report issues | [Support Guide](../SUPPORT.md) |
| Current routes, data flow, API surfaces, and safety boundaries | [Architecture](./architecture.md) |
| Implemented product behavior and module boundaries | [Product Requirements](./requirement.md) |
| Use or maintain the desktop client | [Desktop User Guide](./desktop-user-guide.md) · [Desktop Client PRD](./desktop-client-prd.md) |
| Maintain transcription, audio/video imports, exports, database, or backup sync | [Maintenance Manual](./maintenance.md) |
| Work on the SRS queue or FSRS behavior | [Review System](./review-system.md) |
| Work on Symphony automation | [Symphony Guide](./symphony.md) |
| Release history and long-term iteration milestones | [Changelog](../CHANGELOG.md) |

---

## Tier 2 — For Contributors (changing the codebase)

Read these before opening a pull request.

| Need | Read |
| --- | --- |
| How to contribute, coding style, verification gate | [Contributing Guide](../CONTRIBUTING.md) |
| Security boundary for media, secrets, and reports | [Security Policy](../SECURITY.md) |
| Code of Conduct | [Code of Conduct](../CODE_OF_CONDUCT.md) |
| Active desktop distribution change (proposal, design, tasks) | [Desktop Distribution OpenSpec](../openspec/changes/desktop-first-distribution/proposal.md) |
| Desktop packaging internals and runbook (includes runnable audit scripts) | [Desktop Maintainer Runbook](./desktop-maintainer-runbook.md) |
| Feasibility spike scripts for the desktop shell | [desktop-w0/](./desktop-w0/) — one-off probes (`baseline.md`, `ffmpeg-spike.md`, `usability-protocol.md`, …). Tracked but **not library code**; excluded from ESLint. |
| Background note on Node.js proxy behavior | [solving-node-proxy-timeout.md](./solving-node-proxy-timeout.md) |

---

## Tier 3 — AI-Assisted Development Logs (historical)

These directories record **how features were built, audited, and decided** — sprint contracts, evaluator reports, safety profiles, agent execution plans, and codebase audits. They are valuable as decision history and provenance evidence, but they are **not current behavior specs**.

If a Tier 3 note ever disagrees with a Tier 1 doc, **the Tier 1 doc wins** for present-tense facts. Do not rewrite these logs to pretend a plan was implemented exactly; add a status note or link to the source-of-truth doc instead.

- [agent-harness/](./agent-harness/): sprint contracts, evaluator reports, and safety profiles from the optimization harness (`README.md` is the entry point). Used by `AGENTS.md` and the CI quality gate.
- [ai-harness/](./ai-harness/): decision log, open questions, and audits for AI-assisted work.
- [superpowers/](./superpowers/plans/): agent-oriented execution plans and completed cleanup notes.
- [plans/](./plans/): older feature designs and implementation plans (e.g. audio export, vault filter, i18n migration).
- [review/](./review/): codebase audits, engineering-governance plans, and quality reviews.
- [history/](./history/): moved historical implementation notes that should not live at the repository root.
- [dev-log.md](./dev-log.md): chronological development log; use Tier 1 docs for present behavior.
- [todo.md](./todo.md): lightweight idea/backlog list; not the execution source of truth.
- [2026-04-04-project-roadmap.md](./2026-04-04-project-roadmap.md) · [2026-04-04-project-value-and-optimization-analysis.md](./2026-04-04-project-value-and-optimization-analysis.md): value-first roadmap and product analysis.
- UI review archives: [ui-upgrade-changelog.md](./ui-upgrade-changelog.md), [ui-ux-review-report.md](./ui-ux-review-report.md), [ui-visual-style-review.md](./ui-visual-style-review.md), [requirements-analysis-2026-07.md](./requirements-analysis-2026-07.md).

---

## Agent Context Files

These root-level files configure AI coding assistants and are part of the project's operating rules, not user documentation.

- [AGENTS.md](../AGENTS.md): primary project memory and operating rules for Codex.
- [GEMINI.md](../GEMINI.md): Gemini-oriented context.
- [CLAUDE.md](../CLAUDE.md): Claude-oriented context; do not add new Codex-only rules there.
- [WORKFLOW.md](../WORKFLOW.md): Symphony workflow configuration plus agent prompt.

---

## Documentation Rules

- Put current user/developer docs under `docs/` (Tier 1), not the repository root.
- Keep root files limited to entry points such as `README.md`, `SUPPORT.md`, `AGENTS.md`, agent context files, `CHANGELOG.md`, and license/governance files.
- When behavior changes, update the Tier 1 source-of-truth doc first, then add a short changelog or history note if the old decision context matters.
- Do not rewrite Tier 3 logs to pretend they were implemented exactly. Add a current-status note or link to the Tier 1 doc instead.
