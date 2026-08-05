# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-embedded-subtitle-copy |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Protected Data

| ID | Path / Resource | Allowed Operations | Required Status |
|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | status inspection only | unchanged |
| DATA-SAFE-002 | `public/uploads/`, `public/videos/` | status inspection only | unchanged |
| DATA-SAFE-003 | `.env*` | no read/edit of values | unchanged |

## Domain Boundary

| Domain | In Scope | Out of Scope |
|---|---|---|
| First-session import copy | `messages/en.json`, `messages/zh-CN.json`, first-session copy tests | upload APIs, provider adapters, media assets, database, packaging |

## Rollback

Restore the two message entries and their focused test assertions; no persistent data rollback is needed.
