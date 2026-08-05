# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-05-no-provider-upload-guard |
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
| No-provider import guard | `UploadButton.tsx`, `BatchUploadButton.tsx`, locale messages, focused tests | upload APIs, Provider adapters, media assets, database, packaging |

## Rollback

Restore the scoped guard, message keys, and test assertions; no persistent data rollback is needed.
