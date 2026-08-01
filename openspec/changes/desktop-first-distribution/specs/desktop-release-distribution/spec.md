# Desktop Release Distribution Delta Specification

## ADDED Requirements

### Requirement DRD-001: Ordered platform rollout (FR-081, FR-082, FR-083)

The project SHALL validate macOS Apple Silicon feasibility first, make an explicit Intel/universal decision before signed macOS beta, and add Windows x64 only after the shared runtime passes M1.

#### Scenario: macOS feasibility gate fails

- GIVEN the disposable package cannot reliably run Next standalone, Prisma, packaged FFmpeg, and fixture media
- WHEN M1 is evaluated
- THEN signed-release and Windows implementation do not proceed
- AND the architecture is reviewed

### Requirement DRD-002: Platform-neutral product behavior (FR-084, NFR-050, NFR-051)

Supported desktop platforms SHALL share database schema, API contracts, learning UI, domain behavior, and core tests.

#### Scenario: Windows release diff

- GIVEN macOS beta is working
- WHEN Windows support is implemented
- THEN platform-specific changes are limited to adapters, runtime assets, packaging, signing, updater, and platform tests unless a reviewed shared fix is required

### Requirement DRD-003: Reproducible release manifest (FR-073, NFR-052)

Every release artifact SHALL be traceable to a tagged commit and include version, platform, architecture, checksums, runtime asset versions, and signing/notarization state.

#### Scenario: Package contents are incomplete

- GIVEN the packager omitted a required Prisma engine, migration, static asset, or FFmpeg binary
- WHEN the package-content gate runs
- THEN release fails before publish

### Requirement DRD-004: Signed production artifacts (FR-071, FR-074, FR-075)

Production macOS artifacts SHALL be signed and notarized; Windows SHALL use the documented installer/signing policy; update installation SHALL verify trusted release metadata.

#### Scenario: Tampered update

- GIVEN update bytes do not match trusted metadata or signature requirements
- WHEN Desktop verifies the update
- THEN installation is rejected

### Requirement DRD-005: Stable and beta channels (FR-070)

The updater SHALL distinguish stable and beta channels and SHALL enforce version/schema compatibility rules.

#### Scenario: Incompatible downgrade

- GIVEN active data was migrated beyond the target version's supported schema
- WHEN a downgrade is requested
- THEN the update is blocked or routed through an explicit compatible restore procedure

### Requirement DRD-006: Shared verification independent of packaging (FR-076)

Desktop packaging failures SHALL NOT replace or hide the shared Server verification result; CI SHALL report shared and platform gates separately.

#### Scenario: Windows packaging fails

- GIVEN shared lint, tests, and build pass but Windows package assembly fails
- WHEN CI completes
- THEN the Windows job fails explicitly
- AND the shared verification result remains visible and unchanged

### Requirement DRD-007: Bounded supported scope (FR-085, NFR-053)

Release documentation SHALL list supported platforms/architectures and SHALL NOT imply support for Linux, mobile, SaaS, or app stores without separate approved proposals.

#### Scenario: Public download page

- GIVEN the current release supports macOS and Windows x64 only
- WHEN download documentation is published
- THEN unsupported platforms are clearly labeled rather than offered as best-effort binaries

### Requirement DRD-008: Measured runtime targets (NFR-030, NFR-031, NFR-032)

Beta SHALL measure warm launch, idle memory, and renderer responsiveness on declared reference hardware; targets SHALL remain beta goals until evidence supports guarantees.

#### Scenario: Performance target miss

- GIVEN a beta build exceeds a target
- WHEN release is reviewed
- THEN the result is reported with evidence
- AND the target is optimized, revised transparently, or accepted as a known limitation rather than silently claimed passed
