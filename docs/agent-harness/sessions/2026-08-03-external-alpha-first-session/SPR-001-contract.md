# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-03-external-alpha-first-session |
| Domain | First session / Setup / Shadowing |
| Owner | Codex |
| Date | 2026-08-03 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Demo entry | `src/app/page.tsx`, `src/app/practice/[id]/**`, tests | One click seeds the existing demo and opens blind practice; failure is recoverable. |
| FEAT-002 | Provider semantics | `src/app/setup/page.tsx`, `messages/*.json`, tests | Present key is labeled configured; no-probe and external-data boundary is explicit. |
| FEAT-003 | Capture handoff | `src/app/practice/[id]/PracticeClient.tsx`, messages, tests | Successful Capture exposes current Track Vault and Review links. |
| FEAT-004 | Notation preservation | `src/components/feature/ShadowingConsole.tsx`, test | Text editing sends existing in-memory notation JSON and does not silently clear it. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Real demo speech asset | Requires provenance/licensing and external asset work. |
| OOS-002 | Live provider probe/retry/failover | Adds credentialed external requests and cost. |
| OOS-003 | Staged Vault item/undo/schema migration | Changes persistent data semantics and needs a separate contract. |
| OOS-004 | Import job/state machine and release signing | Separate reliability/release work with external dependencies. |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/`, `public/videos/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/` | click Try the demo on a disposable profile | button shows progress, then opens `/practice/demo-listening-001?demo=1`; blind mode is enabled |
| BV-002 | `/practice/<track>` | Capture a sentence | success notice includes current Track Vault and Review links |
| BV-003 | `/setup` | inspect provider card with a configured key | card says Configured and says connectivity is checked on import |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| targeted node tests | touched route/component contracts | yes | exits 0 |
| `npm run lint` | static quality | yes | exits 0 |
| `npm run test:ci` | full tests | yes | exits 0 |
| `npm run build` | release-sensitive production build | yes | exits 0 |

## Stop Conditions

Stop and ask before protected data changes, provider calls, `.env` edits, sync,
Prisma migration, or release publication.

## Rollback

Revert the additive source, message, test, and Spec files. Persistent data is
not modified by this contract.
