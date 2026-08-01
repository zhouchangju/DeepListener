# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract (documentation-only) |
| Session | `2026-07-22-desktop-openspec` |
| Domain | Desktop distribution / OpenSpec / product planning |
| Owner | AI Agent |
| Date | 2026-07-22 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Desktop product requirements | `docs/desktop-client-prd.md` | Defines the agreed macOS-first, Windows-second product target |
| FEAT-002 | OpenSpec project context | `openspec/config.yaml` | Future artifacts inherit DeepListener safety and verification constraints |
| FEAT-003 | Desktop change artifacts | `openspec/changes/desktop-first-distribution/**` | Proposal, delta specs, design, and implementation tasks form one traceable change |
| FEAT-004 | Documentation navigation | `README.md`, `docs/README.md`, `docs/requirement.md`, `docs/architecture.md`, `docs/todo.md` | Readers can distinguish current implementation from planned desktop behavior |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Electron/Forge dependencies or source files | implementation requires a later Adversarial contract |
| OOS-002 | Data directory migration | active user data cannot be moved during planning |
| OOS-003 | FFmpeg redistribution | legal/build validation belongs to an executable spike |
| OOS-004 | Signing, notarization, installers, releases | external and potentially costly actions are not authorized |
| OOS-005 | AI learning features | desktop distribution must be validated before expanding product intelligence |

## Acceptance

| ID | Requirement | Evidence |
|---|---|---|
| AC-001 | Each PRD requirement has a stable ID and observable acceptance condition | PRD inspection |
| AC-002 | OpenSpec specs use normative requirements and Given/When/Then scenarios | spec inspection |
| AC-003 | Every task names dependencies, a parallel wave/lane, ownership surface, and verification | task matrix inspection |
| AC-004 | The sequence moves uncertainty-reducing spikes before broad implementation | proposal/design/task dependency audit |
| AC-005 | macOS-first does not introduce macOS-specific business logic | platform adapter and CI contract in design/specs |
| AC-006 | Existing current-state docs are not rewritten as future-state claims | documentation diff review |

## Verification

| Check | Purpose | Expected Result |
|---|---|---|
| `node` link checker | validate new relative Markdown links | exits 0 |
| `js-yaml` parse of `openspec/config.yaml` | validate OpenSpec config syntax | exits 0 |
| requirement/spec/task ID audit | verify traceability and task metadata | no missing coverage |
| `git diff --check` | whitespace validation | exits 0 |
| `git status --short` | confirm documentation-only scope for this session | no unexpected new source modifications |

## Rollback

| Area | Rollback |
|---|---|
| New PRD/OpenSpec/session files | delete only the new files from this session |
| Documentation navigation | revert only this session's link/roadmap hunks |
| Runtime/data/deploy | N/A; no runtime or protected data is changed |
