# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-embedded-subtitle-copy |
| Domain | First-session import copy |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Expected Behavior |
|---|---|---|
| FEAT-001 | Embedded-subtitle decision card copy in both locales | The no-provider embedded path names video explicitly; SRT/VTT remains the audio/subtitle-sidecar path. |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Import destinations and media/provider behavior remain unchanged. | Existing decision-guide and import wizard tests; full quality gate. |
| AC-CHANGE-001 | English and Chinese copy no longer claims that audio can contain supported embedded subtitles. | `first-session-language.test.ts` and source assertions. |

## Data Safety

No database, media, environment, secret, network, or sync operation is permitted.

## Rollback

Restore the scoped message entries and test assertions.
