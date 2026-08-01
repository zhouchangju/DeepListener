# Desktop Configuration and Secrets Delta Specification

## ADDED Requirements

### Requirement DCS-001: UI provider configuration (FR-030, FR-031)

Desktop users SHALL select a supported transcription provider and add, replace, or remove its credential through Settings without editing `.env`.

#### Scenario: Configure provider

- GIVEN the user selects Deepgram, OpenAI, or Google
- WHEN the user submits a new credential
- THEN the selected provider and configured state persist across restart
- AND the credential value is not displayed after storage

#### Scenario: Remove credential

- GIVEN a provider credential is configured
- WHEN the user confirms removal
- THEN the secret is deleted from the credential backend
- AND readiness reports the provider as not configured

### Requirement DCS-002: Secret confidentiality (FR-032, FR-033, NFR-015)

Provider credentials and per-launch authorization values SHALL NOT appear in browser-readable status, persisted non-secret settings, diagnostic exports, or logs. Desktop SHALL use an OS-backed secret facility or an explicitly reviewed encrypted fallback.

#### Scenario: Readiness serialization

- GIVEN a real provider secret is stored
- WHEN readiness and diagnostics are serialized
- THEN only a state such as configured, missing, invalid, or unknown is present
- AND the secret value is absent

#### Scenario: Diagnostic export

- GIVEN logs contain a structured provider operation
- WHEN the user exports diagnostics
- THEN credential fields, authorization tokens, transcripts, notes, media contents, and raw database records are redacted or excluded by default

### Requirement DCS-003: Least-secret provider execution (FR-034)

Only the selected provider credential SHALL be available to the selected transcription operation.

#### Scenario: Deepgram operation

- GIVEN multiple providers were configured previously and Deepgram is selected
- WHEN a transcription operation starts
- THEN the operation receives Deepgram configuration only
- AND unused provider secrets are not injected into renderer state or the operation context

### Requirement DCS-004: Explicit connectivity checks (FR-035)

Opening Settings or Diagnostics SHALL NOT contact an external provider. A connectivity check SHALL require an explicit user action and disclose that a credentialed request may occur or incur cost.

#### Scenario: Open Settings

- GIVEN a provider credential exists
- WHEN the user opens Settings
- THEN no external provider request is sent

#### Scenario: Run connectivity check

- GIVEN the user has acknowledged the check behavior
- WHEN the user starts the check
- THEN only the selected provider is contacted
- AND the UI reports success or a categorized safe failure

### Requirement DCS-005: Actionable provider failures (FR-036)

The system SHALL distinguish invalid credential, provider unreachable, proxy failure, quota/rate limit, and unusable transcript outcomes without exposing arbitrary internal errors.

#### Scenario: Invalid credential

- GIVEN the selected provider rejects authentication
- WHEN the error reaches the UI
- THEN the user is directed to replace/check that provider's credential
- AND no provider-specific secret details are exposed

#### Scenario: Network timeout

- GIVEN the provider request times out
- WHEN the operation fails
- THEN the user receives network/proxy guidance distinct from credential guidance

### Requirement DCS-006: Readiness truthfulness (FR-025, FR-060, FR-061)

Diagnostics SHALL distinguish runtime asset availability, data-root readability/writability, database compatibility, configured credential presence, and verified provider connectivity.

#### Scenario: Read-only database

- GIVEN the database exists but cannot be written by the service
- WHEN readiness runs
- THEN database status is Action needed, not Ready

#### Scenario: Key exists without live probe

- GIVEN a credential is stored but no connectivity test has run
- WHEN readiness runs
- THEN it reports configured/unverified rather than connected/valid

### Requirement DCS-007: Bounded diagnostics (FR-062, FR-063, FR-064)

Logs SHALL be bounded/rotated, startup failure summaries SHALL survive restart, and user-initiated diagnostic export SHALL be redacted by default.

#### Scenario: Log limit reached

- GIVEN log retention or size limit is reached
- WHEN a new event is written
- THEN old logs are rotated or removed according to policy
- AND active user data is unaffected
