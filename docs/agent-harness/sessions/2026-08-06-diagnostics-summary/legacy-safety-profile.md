# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-06-diagnostics-summary |
| Mode | Contract |
| Owner | AI Agent |
| Date | 2026-08-06 |

## Domain Boundary

| Domain | In Scope | Out Of Scope |
|---|---|---|
| Setup diagnostics UI | `src/app/setup/DiagnosticsSummary.tsx`, `DataSafetyActions.tsx`, setup translations/tests | diagnostics service/API schema, native packaging, secrets, user data, provider requests |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Diagnostics UI never renders absolute paths, secrets, transcripts, notes, or media names. | source contract + redacted API fixture |
| AC-CHANGE-001 | Ordinary learners can see categorical runtime/data/provider status and refresh it from Setup. | component contract test |

## Safety

- No database, media, `.env*`, provider, or filesystem writes are performed by this UI.
- The UI consumes only the existing allow-listed `GET /api/diagnostics` response.

## Rollback

Revert the new component, translation keys, tests, and this session documentation.
