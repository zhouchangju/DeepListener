# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-no-provider-upload-guard |
| Domain | No-provider import flow |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Expected Behavior |
|---|---|---|
| FEAT-001 | Single and batch generic import entrypoints | When the server confirms no Provider is configured, audio files are rejected before upload with an actionable subtitle/Setup hint; video files remain eligible for embedded captions. |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Configured-provider and unknown-provider profiles retain existing upload behavior. | Upload/import regression tests and full quality gate. |
| AC-CHANGE-001 | No-provider single and batch audio uploads do not create an import request. | focused source tests and client classification guard. |

## Data Safety

No database, media, environment, secret, network, or sync operation is permitted.

## Rollback

Restore the scoped UI guards and messages.
