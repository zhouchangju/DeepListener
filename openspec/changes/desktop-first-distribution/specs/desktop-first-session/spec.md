# Desktop First Session Delta Specification

## ADDED Requirements

### Requirement DFS-001: Two first-run paths (FR-021)

First run SHALL offer a legal zero-provider demo path and a personal-media/provider setup path, and the user SHALL be able to switch paths.

#### Scenario: New user chooses demo

- GIVEN a new profile
- WHEN the user chooses Try the demo
- THEN the application opens bundled demo practice without provider configuration

#### Scenario: New user chooses personal media

- GIVEN a new profile
- WHEN the user chooses Set up my media
- THEN the application guides provider configuration and import readiness

### Requirement DFS-002: Legally cleared provider-free demo (FR-022)

Demo media and timeline data SHALL be owned, generated, or clearly licensed, SHALL record provenance, and SHALL NOT call an external transcription provider.

#### Scenario: Demo is installed

- GIVEN the application package contains demo assets
- WHEN provenance is audited
- THEN source, license/ownership, allowed redistribution, and attribution are documented

### Requirement DFS-003: Demonstrate the learning loop (FR-023)

The demo SHALL exercise blind listening, sentence navigation/reveal, one learning capture action, and discovery of Vault/Review next steps.

#### Scenario: Complete demo journey

- GIVEN the user starts the demo
- WHEN the user follows the guided journey
- THEN they complete at least one sentence-level learning action
- AND see where that item continues in the learning loop

### Requirement DFS-004: Isolated removable demo data (FR-024)

Demo records SHALL be distinguishable from personal records and SHALL be removable without deleting or mutating personal media, notes, or review history.

#### Scenario: Remove demo after personal use

- GIVEN the user has demo and personal tracks
- WHEN demo removal is confirmed
- THEN only demo-owned records/assets are removed

### Requirement DFS-005: Accessible and comprehensible first-run UI (NFR-040, NFR-041, NFR-042, NFR-043)

First-run, recovery, Settings, backup, and update actions SHALL be keyboard accessible, communicate state beyond color, state impact/recovery, and use understandable native file dialogs.

#### Scenario: Keyboard-only first run

- GIVEN the user operates without a pointer
- WHEN they navigate first run and start the demo
- THEN all required actions and focus states are reachable and understandable

### Requirement DFS-006: Evidence-based usability gate (KPI-001 through KPI-005)

Formal promotion SHALL use observed clean-machine sessions and controlled data-retention tests rather than treating successful build or screenshots as adoption proof.

#### Scenario: Beta promotion review

- GIVEN fewer than five target-user sessions or unresolved repeated intervention points
- WHEN formal promotion is considered
- THEN the usability gate remains incomplete
- AND the observed blockers are converted to requirements/tasks

#### Scenario: Upgrade retention gate

- GIVEN controlled migration fixtures
- WHEN the supported upgrade suite runs
- THEN all required database/media invariants are preserved before release approval
