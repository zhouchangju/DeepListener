# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-06-06-audit-remediation |
| Domain | Setup / API / Audio / Dashboard / Review / Quality Gate / Docs |
| Owner | AI Agent |
| Date | 2026-06-06 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Setup safety | `bin/setup`, tests | Setup never edits secrets and applies existing migrations safely |
| FEAT-002 | Library and export failures | library client, export routes, helpers | Rejected mutations and incomplete exports fail visibly |
| FEAT-003 | Local-day consistency | study time, dashboard analytics, review page | Date windows use one local-day model |
| FEAT-004 | API 500 contracts | API routes and policy tests | Raw exception messages stay server-side only |
| FEAT-005 | Test and hook hardening | pure query helpers, hook script/tests, CI policy | Tests avoid Prisma native side effects and hooks work with local Node |
| FEAT-006 | Documentation | README/docs/changelog as needed | Docs reflect safety and behavior changes |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Prisma schema or migration changes | Not needed for reviewed defects |
| OOS-002 | Database contents and uploaded audio | Protected user data |
| OOS-003 | Feature redesigns | Goal is remediation without behavior drift |
| OOS-004 | Deployment path changes | No deployment bug is being fixed |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Valid exports still build archives | helper and route behavior tests |
| AC-PRESERVE-002 | Existing dashboard/review semantics remain compatible except UTC mismatch fix | analytics/review targeted tests |
| AC-PRESERVE-003 | No protected data or secrets are modified | git status and no data commands |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Setup script avoids `.env` edits and root database confusion | setup policy test |
| AC-CHANGE-002 | Missing selected export source returns a client error | export policy tests |
| AC-CHANGE-003 | Library status/archive false success is removed | client helper test |
| AC-CHANGE-004 | API routes use shared internal error response | API contract policy test |
| AC-CHANGE-005 | Hook risky-command detection is command-aware and internal commands do not require PATH npm/npx | hook tests/source test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test <paths>` | targeted regression | yes | exits 0 |
| repo node test runner | broader tests | yes | exits 0 |
| source-scoped ESLint | lint source and scripts | yes | exits 0 |
| TypeScript no emit | type check | yes | exits 0 |
| production build | build confidence | attempt | exits 0 or documented native blocker |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | N/A | No visual workflow changes expected | skipped unless code changes touch visible UI |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| Backup sync execution needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into another domain | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert touched files on this branch |
| Data | N/A; no data mutation permitted |
| Deploy | N/A; no deployment config changes planned |
