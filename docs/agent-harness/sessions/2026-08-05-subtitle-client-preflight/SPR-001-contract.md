# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-subtitle-client-preflight |
| Domain | Subtitle import preflight |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Expected Behavior |
|---|---|---|
| FEAT-001 | Local SRT/VTT validation before media upload | Invalid or empty subtitle content is rejected locally; no import-job request is created. Valid subtitle content keeps the existing streaming and recovery contract. |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Valid subtitle import still posts media, attaches the sidecar, and transcribes/activates as before. | Existing wizard and import-job tests; full quality gate. |
| AC-CHANGE-001 | Client checks parseable subtitle content before the first media request. | `ImportMediaWizard.test.ts` source contract and focused tests. |

## Data Safety

No database, media, environment, secret, Provider, or sync operation is permitted.

## Rollback

Restore the scoped wizard code and test assertion.
