# Forbidden List

Operations, files, patterns, and assumptions agents must NOT do in this project.

| Rule | Source | Verification |
|---|---|---|
| Do not delete, overwrite, migrate, or sync `prisma/dev.db` without explicit user confirmation | `docs/agent-harness/README.md` Protected Data | Check file untouched after session |
| Do not delete, overwrite, or sync `public/uploads/` without explicit user confirmation | `docs/agent-harness/README.md` Protected Data | Check directory untouched after session |
| Do not edit `.env*`, secrets, credential files, or local-only config | `AGENTS.md` Security Tips | No .env changes in diffs |
| Do not weaken lint, test, type, build, deploy, or data-safety rules | `AGENTS.md` Codex Self-Repair | Config files unchanged |
| Do not treat `.worktrees/**/.next` generated output as source | `AGENTS.md` Learned from Mistakes | No edits under worktree .next dirs |
| Do not use `next build` directly; use `npm run build` (scripts/next-build.mjs) | `README.md` | Build via npm script only |
| Do not broad-format, rename, or cleanup outside sprint domain | `docs/agent-harness/README.md` Known Hazards | Diff scope matches contract |
| Do not commit secrets, API keys, or local paths to git | `AGENTS.md` Security Tips | No secrets in staged files |
| Do not assume `npm run sync` is safe; it overwrites remote state. Use `npm run sync:safe` instead | `docs/agent-harness/README.md` | sync:safe adds confirmation prompt |
| Do not skip Prisma client regeneration after schema changes | `CLAUDE.md` | Restart dev server after schema edits |
| Do not run `npm run lint` on `.worktrees/**/.next` directories | `AGENTS.md` Learned from Mistakes | Exclude worktree build output from lint |
| Do not fabricate test results or skip verification | `AGENTS.md` Codex Self-Repair | Report actual command output |
| Do not install new dependencies without explicit user approval | General principle | No new entries in package.json without approval |
| Do not store private paths like `/Users/<name>/...` in generated files | `harness-output-spec.md` | Grep for absolute user paths |
