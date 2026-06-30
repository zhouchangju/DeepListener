# Open Questions

Unresolved facts that must not be guessed. Record findings here instead of inventing answers.

| ID | Question | Owner | Priority | Status | Notes |
|---|---|---|---|---|---|
| Q-001 | Is the `basePath`/`assetPrefix` deployment configuration stable, or will it change? | Project owner | Medium | Open | Currently not set in next.config.ts; previous docs mention `/DeepListener` subpath |
| Q-002 | Should `npm run sync` be restricted to manual-only or wrapped in a confirmation gate? | Project owner | High | Open | Currently HIGH RISK with no safety prompt |
| Q-003 | Are there production users, or is this a single-user local tool? | Project owner | Medium | Open | Affects SLA, monitoring, and data safety requirements |
| Q-004 | What is the target test coverage percentage? | Project owner | Low | Open | Current test/line ratio is 0.13; no explicit target set |
| Q-005 | Should `.worktrees/` directories be gitignored or cleaned up? | Project owner | Low | Open | Multiple worktree copies exist with duplicate source files |
