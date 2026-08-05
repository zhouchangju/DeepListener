# DeepListener Sprint Contrac

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-demo-timeline |
| Domain | Quality Gate / Demo Asset Contract |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Candidate Demo timeline fixture | `scripts/demo-timeline.example.json`, `src/lib/demo-timeline-contract.test.ts` | Maintainers get a validated, ordered, non-overlapping six-cue template compatible with `replace-demo-audio.mjs --timeline`. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Real speech audio, provenance, licensing, checksum, and release packaging | Requires HG-01 human approval and external assets. |
| OOS-002 | Practice, Provider, import, and database behavior | No runtime product code is needed for this contract. |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | The synthetic Demo remains clearly non-release and the public preflight remains fail-closed. | `src/lib/desktop-packaging-contract.test.ts` and implementation-status note |
| AC-PRESERVE-002 | Existing replacement-script timeline validation remains the source of truth. | source assertion in T121 test |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Add a maintainer-facing candidate timeline with six learner-facing English cues and exact seconds. | fixture review and T121 contract test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `public/videos/` | unchanged |
| DATA-SAFE-004 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/lib/demo-timeline-contract.test.ts` | validate cue schema, ordering, and script compatibility | yes | exits 0, 2 tests pass |
| `git diff --check` | patch hygiene | yes | exits 0 |
| `npm run lint` | repo regression | baseline already green | exits 0 |
| `npm run build` | repo regression | baseline already green | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | none | This is a maintainer-only fixture and has no runtime route. | No browser behavior changes. |

## Stop Conditions

| Condition | Action |
|---|---|
| Real asset or provenance is needed | Stop and request HG-01 approval/assets |
| Protected data or `.env*` would change | Stop and ask for explicit confirmation |
| Timeline schema changes in the replacement script | Split a new contract and update the test |

## Rollback

| Area | Rollback |
|---|---|
| Code/docs | Remove the T121 fixture, test, and session evidence files |
| Data | N/A |
| Deploy | N/A |
