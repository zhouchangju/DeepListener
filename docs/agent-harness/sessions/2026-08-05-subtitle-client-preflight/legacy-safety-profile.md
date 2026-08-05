# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-subtitle-client-preflight |
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
| Subtitle import preflight | `ImportMediaWizard.tsx`, focused tests | upload APIs, Provider adapters, persisted subtitle parser behavior, media assets |

## Rollback

Restore the client preflight and its focused test assertion; no persistent data rollback is needed.
