# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-05-desktop-legacy-migration-recovery |
| Domain | Desktop database startup and recovery |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Recover the known pre-runner Desktop schema | `src/lib/migration-runner.ts` and tests | Exact legacy schema is baselined through migration 15, then migration 16 runs normally |
| FEAT-002 | Preserve actionable startup evidence | `src/instrumentation.ts`, startup contract test | Logs include the safe failure message with migration stage/name |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Generic schema inference or automatic repair of arbitrary databases | Unsafe and not required for the reproduced defect |
| OOS-002 | Prisma schema or migration SQL edits | Existing migration 16 is correct |
| OOS-003 | FFmpeg runtime manifest packaging | Separate non-fatal release issue |
| OOS-004 | Media, provider, sync, or credential changes | Unrelated to startup failure |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Fresh, fully tracked, partially tracked, drifted, and malformed profiles keep existing safety semantics | targeted migration suite |
| AC-PRESERVE-002 | Protected database and media resources stay byte/metadata stable | before/after checks |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Known legacy profile upgrades without replaying initial `CREATE TABLE` SQL | disposable legacy fixture test |
| AC-CHANGE-002 | Unknown untracked schema refuses recovery | disposable negative fixture test |
| AC-CHANGE-003 | Startup log surfaces the sanitized error message | source contract test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | Desktop data-root database | unchanged during implementation and verification |
| DATA-SAFE-003 | `public/uploads/`, `public/videos/`, `.env*` | unchanged |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| Targeted node test command from safety profile | red/green regression | yes | fails before implementation, passes after |
| `npm run verify` | full gate | yes | exits 0 |
| `npm run desktop:dist -- --dir --alpha` | packaged runtime artifact | yes | exits 0 |

## Runtime Checks

| ID | Profile | Steps | Expected Result |
|---|---|---|---|
| RV-001 | Clean disposable profile | launch packaged standalone with empty data root | all migrations apply and service becomes ready |
| RV-002 | Known legacy disposable profile | copy the pre-migration backup to a disposable root and launch packaged standalone | migration 16 applies and service becomes ready without changing source backup |

## Stop Conditions

| Condition | Action |
|---|---|
| Real Desktop data write is needed | finish and review the code/package evidence first, then request or confirm the separate upgrade operation |
| Schema does not match the exact known legacy fingerprint | fail closed; do not baseline |
| Required full gate fails after three distinct fixes | report blocker and preserve evidence |
| Scope expands to FFmpeg or unrelated domains | split a separate sprint |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert the narrow diff |
| Data | no active-data writes in this sprint phase; disposable fixtures are discarded by tests |
| Deploy | discard local package artifact; do not replace the installed app |
