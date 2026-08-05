# DeepListener Sprint Contract

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-06-diagnostics-summary |
| Domain | Setup / diagnostics UI |
| Date | 2026-08-06 |

## Scope

| ID | In Scope | Expected Behavior |
|---|---|---|
| FEAT-001 | Redacted diagnostics summary | Setup shows only categorical status rows and a refresh action; API errors degrade to a localized message. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Provider connectivity probes and native dialogs | explicit user consent/platform gates remain separate |

## Required Checks

| Command | Expected |
|---|---|
| `node --import tsx --test src/app/setup/DiagnosticsSummary.test.ts` | pass |
| `npm run lint` | pass |
| `npm run test:ci` | pass, known Windows skips only |
| `npm run build` | pass |
