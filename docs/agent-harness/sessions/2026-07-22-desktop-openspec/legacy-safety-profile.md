# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | `2026-07-22-desktop-openspec` |
| Mode | Contract (documentation-only) |
| Owner | AI Agent |
| Date | 2026-07-22 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; not inspected | no access required | any write, migration, delete, or sync |
| DATA-SAFE-002 | `public/uploads/` | exists; not inspected | no access required | any write, delete, or sync |
| DATA-SAFE-003 | `public/videos/` | exists; not inspected | no access required | any write, delete, commit, or sync |
| DATA-SAFE-004 | `.env*` | local file exists; values not read | no access required | read, edit, or print values |

## Existing Working Tree Boundary

- The working tree already contains onboarding implementation changes created by another tool.
- This session may update documentation that overlaps `README.md` or `docs/architecture.md`, but it must preserve the existing onboarding edits.
- This session must not modify application source, tests, package metadata, Prisma schema, media, or local configuration.

## Domain Boundary

| Domain | In Scope | Explicitly Out Of Scope |
|---|---|---|
| Desktop product planning | PRD, OpenSpec proposal/specs/design/tasks, documentation navigation | Electron implementation, dependencies, migrations, packaging, signing, provider calls |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | `docs/requirement.md` remains a description of implemented behavior | planned desktop behavior is clearly labeled and linked, not presented as shipped |
| AC-PRESERVE-002 | onboarding work in the dirty tree remains intact | final `git diff` contains no reverted onboarding changes |
| AC-PRESERVE-003 | protected data and secrets remain untouched | documentation-only file list and command log |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Establish a final desktop-client PRD | requirements, scope, success metrics, rollout, risks, and acceptance are present |
| AC-CHANGE-002 | Establish an OpenSpec spec-driven change | proposal, delta specs, design, and tasks exist and are traceable |
| AC-CHANGE-003 | Make task parallelism explicit | every implementation task declares dependencies, parallel wave/lane, and verification |
| AC-CHANGE-004 | Update related documentation entry points | README/docs map/current PRD/current architecture link to the new target-state artifacts |

## Stop Conditions

- Any edit to application source, package dependencies, `.env*`, Prisma schema, database, uploads, or videos.
- Any migration, provider network call, sync command, installer build, or release action.
- Any need to replace rather than preserve the existing onboarding changes.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| New planning files | remove only files created by this session | no runtime or data impact |
| Existing docs | revert only the hunks added by this session | preserve earlier onboarding hunks |
| Data/deployment | N/A | no data or deployment mutation is authorized |
