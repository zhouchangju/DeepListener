# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-provider-recommendation |
| Domain | Provider decision guidance |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Explicit recommended starting provider | provider guidance model, Setup decision guide, both locale messages, tests | The decision guide visually identifies one default starting point, gives its existing fit explanation, and keeps alternatives available. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Live price/availability claims or automatic Provider probing | These are volatile or cost-bearing and require explicit user action. |
| OOS-002 | HG-02 approval and real Provider E2E | Human/external release gates; implementation must not pretend they are closed. |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Static official URLs and zero-request-on-open behavior remain unchanged. | `provider-guidance.test.ts`, `setup/page.structure.test.ts` |
| AC-CHANGE-001 | One and only one provider is marked recommended in both locales. | model/UI/i18n tests and disposable browser DOM |

## Browser Check

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/setup` | Open setup in a disposable profile and inspect provider comparison cards. | Deepgram (the existing default fallback) shows a localized recommendation badge; OpenAI and Google remain available without the badge. No external request is made by page load. |

## Data Safety

| Path | Required Status |
|---|---|
| `prisma/dev.db` | unchanged |
| `public/uploads/` | unchanged |
| `.env*` | unchanged |

## Rollback

Restore the scoped files; no persistent data is changed.
