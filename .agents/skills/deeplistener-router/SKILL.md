---
name: deeplistener-router
description: Route common DeepListener project tasks to the correct local skill or documentation. Use when starting work on this project, when the task is unclear, or when navigation is needed.
---

# DeepListener Router

Route the current task to the right local context.

## Decision Tree

1. **First time on this project?** → Read `.agents/skills/deeplistener-onboarding/SKILL.md`
2. **Build/startup/dependency failure?** → Read `.agents/skills/deeplistener-dev-doctor/SKILL.md`
3. **Running lint, test, or build checks?** → Read `.agents/skills/deeplistener-quality-gate/SKILL.md`
4. **Implementing a feature or fix?** → Read `docs/agent-harness/README.md` for mode selection, then follow the harness workflow
5. **Follow-up from audit findings?** → Read `.agents/skills/deeplistener-audit-followup/SKILL.md`
6. **Need project context?** → Read `.docs4agents/codebase-inventory.md` for file map
7. **Not sure what's forbidden?** → Read `.docs4agents/forbidden-list.md`

## Key References

- `AGENTS.md` — primary entrypoint and operating rules
- `docs/README.md` — documentation map
- `docs/agent-harness/README.md` — harness modes and workflow
- `.docs4agents/` — context pack for agent handoff
