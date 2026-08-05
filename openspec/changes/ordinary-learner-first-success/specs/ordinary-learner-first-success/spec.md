# Ordinary Learner First Success Delta Specification

## ADDED Requirements

### Requirement OFS-001: Learner distribution hides development prerequisites

Supported Desktop editions SHALL start and reach the first-session UI without requiring system Node.js, npm, Prisma CLI, FFmpeg/ffprobe, terminal commands, or manual `.env` editing. The Server edition SHALL remain explicitly labeled for advanced/self-hosted use.

#### Scenario: Clean Desktop profile

- GIVEN a supported clean operating-system profile with no developer toolchain
- WHEN the learner installs and launches DeepListener
- THEN the application supplies or resolves its required runtime assets
- AND reaches a learner-facing first-session state without terminal intervention

#### Scenario: Required packaged asset is missing

- GIVEN the Desktop package is missing a required runtime asset
- WHEN startup preflight runs
- THEN the application does not open a partially broken Library or Practice page
- AND shows a bounded recovery state that names the unavailable capability without exposing internal paths or secrets

#### Scenario: Server edition entry

- GIVEN a user chooses the source/self-hosted path
- WHEN they read installation guidance or setup diagnostics
- THEN the path is labeled for technical operators
- AND learner-facing Desktop claims are not presented as current Server automation

### Requirement OFS-002: Readiness gate prevents known-dead-end navigation

Routes that require a compatible writable database SHALL NOT render their normal data-dependent UI when readiness is known to be blocked. The user SHALL receive an action that can change the blocking condition.

#### Scenario: Desktop database initializes normally

- GIVEN a new Desktop profile
- WHEN startup runs versioned initialization
- THEN the database is prepared idempotently before Library becomes available
- AND no database command is shown to the learner

#### Scenario: Desktop initialization fails safely

- GIVEN database initialization, backup, or migration fails
- WHEN the local service starts
- THEN normal data routes remain unavailable
- AND a recovery state explains impact, confirms preserved data, and offers only valid recovery/diagnostic actions

#### Scenario: Server database is missing

- GIVEN the Server edition database is not initialized
- WHEN the user opens Library, Practice, Vault, Review, or Dashboard
- THEN the user is directed to the Setup database check rather than a generic retry loop
- AND advanced instructions may show the exact operator command and documentation link

#### Scenario: Optional FFmpeg capability is missing

- GIVEN audio playback remains usable but video processing/export is unavailable
- WHEN readiness is evaluated
- THEN basic audio practice remains available
- AND only affected actions are disabled or explained

### Requirement OFS-003: Onboarding is an executable and accessible journey

Every onboarding primary action SHALL perform or navigate to the action described by the step. Completion SHALL start a meaningful learning path rather than merely dismissing the guide.

#### Scenario: Complete Demo onboarding

- GIVEN a new learner chooses the Demo path
- WHEN they activate the final onboarding action
- THEN the Demo practice journey starts
- AND the guide records completion without blocking future replay

#### Scenario: Use personal media onboarding

- GIVEN a learner chooses the personal-media path
- WHEN the current step describes readiness, subtitles, or import
- THEN the primary action opens the corresponding real surface
- AND the learner can return without losing prior progress

#### Scenario: Spotlight target is visible

- GIVEN a step highlights an existing navigation or practice control
- WHEN the user activates that target by pointer or keyboard
- THEN the target receives the action
- AND no overlay intercepts it

#### Scenario: Keyboard-only guide

- GIVEN the learner uses only a keyboard
- WHEN the guide opens
- THEN focus enters the guide or intentionally selected target
- AND Tab order, Escape dismissal, previous/next actions, focus return, and screen-reader labels are deterministic

#### Scenario: Narrow viewport target is unavailable

- GIVEN the intended target is hidden in a collapsed menu
- WHEN the step renders
- THEN the guide provides a visible direct action to that destination
- AND does not spotlight empty space

### Requirement OFS-004: Demo proves listening value with distributable speech

The bundled Demo SHALL contain meaningful spoken English with approved redistribution provenance and SHALL demonstrate the smallest complete learning loop without external Provider calls.

#### Scenario: Audit Demo provenance

- GIVEN a release candidate contains Demo assets
- WHEN the package provenance check runs
- THEN the speaker/source, ownership or license, redistribution permission, attribution, checksum, transcript, timing data, locale/accent, and difficulty are documented

#### Scenario: Complete Demo learning loop

- GIVEN a new learner starts the Demo
- WHEN they follow the guided journey
- THEN they hear spoken English, use blind listening, reveal text, navigate/replay a sentence, save one difficult sentence, and discover its review continuation

#### Scenario: Demo runs offline

- GIVEN no Provider credential and no network access
- WHEN the Demo starts and completes
- THEN no external transcription request is attempted
- AND the Demo remains usable

#### Scenario: Remove Demo after personal use

- GIVEN Demo and personal data coexist
- WHEN Demo removal is confirmed
- THEN only Demo-owned records/assets are removed
- AND personal Track, media, notes, review history, and study history remain unchanged

### Requirement OFS-005: Provider setup minimizes decision and trust burden

Provider setup SHALL explain whether the learner needs transcription, offer a recommended default with reasons, compare alternatives without stale price promises, and keep secret/configuration boundaries truthful.

#### Scenario: Learner has usable subtitles

- GIVEN the selected media contains embedded subtitles or the learner has a sidecar subtitle
- WHEN setup determines available paths
- THEN the no-Provider subtitle path is offered before credential configuration

#### Scenario: Learner needs transcription

- GIVEN the media has no usable subtitle
- WHEN the learner enters Provider setup
- THEN the UI shows one recommended choice for the current supported context
- AND allows comparison of provider fit, external audio disclosure, current-pricing link, credential steps, and known network considerations

#### Scenario: Open Provider settings

- GIVEN credentials may already exist
- WHEN the learner opens Provider settings
- THEN no external request is made
- AND no secret value is rendered back to the client

#### Scenario: Explicit connectivity test

- GIVEN a credential is configured
- WHEN the learner explicitly starts a connectivity test after seeing its disclosure
- THEN only the selected Provider is contacted
- AND success or a categorized safe failure is reported

### Requirement OFS-006: Personal subtitle path works without a Provider

The learner SHALL be able to pair supported local media with a supported SRT or VTT subtitle file, validate the pairing locally, and create sentence timing without an external transcription request.

#### Scenario: Import valid media and SRT

- GIVEN a supported media file and parseable SRT with valid non-overlapping cues
- WHEN the learner imports them together
- THEN the Track and sentences are created from local subtitle timing
- AND no Provider is contacted

#### Scenario: Subtitle appears mismatched

- GIVEN the subtitle duration or cue range materially conflicts with media duration
- WHEN validation runs
- THEN the learner sees a warning and may replace the subtitle or choose transcription
- AND no Track is silently created with known-invalid timing

#### Scenario: Subtitle parse fails

- GIVEN the selected subtitle is malformed or unsupported
- WHEN parsing fails
- THEN the media remains available for retry
- AND the learner can select another subtitle or choose transcription without re-uploading the media

### Requirement OFS-007: Import and transcription are recoverable operations

Import SHALL have explicit durable stages and SHALL preserve recoverable media when transcription, subtitle processing, Provider access, network, quota, or Track creation fails. Retrying SHALL be idempotent and SHALL NOT create duplicate Tracks or repeat completed stages unnecessarily.

#### Scenario: Successful import

- GIVEN a valid media source and a usable subtitle/transcription result
- WHEN import completes
- THEN exactly one Track is activated with its sentence timeline
- AND temporary operation state is finalized according to policy

#### Scenario: Provider timeout after media persistence

- GIVEN media has been safely staged and the Provider times out
- WHEN the failure is reported
- THEN the staged media and operation metadata remain recoverable
- AND the learner can retry without selecting or uploading the media again

#### Scenario: Replace Provider and retry

- GIVEN an import is blocked by invalid credentials, quota, or provider-specific failure
- WHEN the learner selects another configured Provider and retries
- THEN the same staged media is processed
- AND at most one final Track is created

#### Scenario: Process stops during transcription

- GIVEN the application exits after staging but before activation
- WHEN the application restarts
- THEN the operation is shown as resumable, safely failed, or awaiting cleanup
- AND no incomplete Track is presented as ready to practice

#### Scenario: User removes a failed import

- GIVEN a failed operation owns only staged media and metadata
- WHEN the learner confirms removal
- THEN only that operation's owned artifacts are deleted
- AND active Tracks and personal media outside the operation remain unchanged

#### Scenario: Disk is insufficient

- GIVEN available space is below the declared staging requirement
- WHEN import preflight runs
- THEN processing is blocked before partial promotion
- AND the learner is told the required action without losing existing data

### Requirement OFS-008: First-session language uses progressive disclosure

First-session surfaces SHALL use learner-oriented labels and SHALL defer internal algorithms, storage, provider, and workflow-state terminology until it helps a user decision.

#### Scenario: New learner sees review continuation

- GIVEN the learner saved a difficult sentence
- WHEN the handoff appears
- THEN it says when/where the sentence can be reviewed in plain language
- AND FSRS details remain available only as optional explanation

#### Scenario: Advanced user requests details

- GIVEN an advanced user opens diagnostics or advanced settings
- WHEN technical details are requested
- THEN precise terms such as SQLite, Provider, FSRS, and internal status may be shown
- AND the values remain accurate and redacted where required

#### Scenario: Language changes

- GIVEN the learner switches between Chinese and English
- WHEN first-session, error, setup, and recovery surfaces rerender
- THEN visible and accessible labels use the selected language consistently
- AND user media/transcripts are not translated or modified

### Requirement OFS-009: Critical first-success surfaces meet accessibility contracts

Welcome, onboarding, setup, import, recovery, Demo, save-to-library, and review-discovery actions SHALL be usable by keyboard and assistive technology, reflow at 200% zoom, and communicate state beyond color.

#### Scenario: 200% zoom

- GIVEN a supported desktop viewport at 200% zoom
- WHEN the learner completes the first-success path
- THEN primary actions, error recovery, dialog controls, and status text remain visible and operable without two-dimensional scrolling

#### Scenario: Screen reader status updates

- GIVEN import or Demo step status changes asynchronously
- WHEN the state changes
- THEN a concise accessible status is announced
- AND repeated timer updates do not create excessive announcements

#### Scenario: Reduced motion

- GIVEN the operating system requests reduced motion
- WHEN spotlight, progress, waveform guidance, or transitions render
- THEN nonessential motion is removed or reduced
- AND task completion remains understandable

### Requirement OFS-010: Promotion requires adversarial and target-user evidence

Formal learner promotion SHALL remain blocked until clean-profile installation, first-success usability, failure recovery, accessibility, and data-retention evidence satisfy the PRD gates on every claimed platform.

#### Scenario: Build passes but usability evidence is missing

- GIVEN lint, tests, build, and packaging pass
- WHEN fewer than five target users completed the observed journey
- THEN learner promotion remains blocked

#### Scenario: One repeated intervention point

- GIVEN two or more observed learners require help at the same step
- WHEN the usability gate is evaluated
- THEN the blocker is converted into a scoped remediation task
- AND the affected journey is rerun after the fix

#### Scenario: Protected-data invariant fails

- GIVEN a migration, import retry, update, restore, or Demo removal test changes protected data unexpectedly
- WHEN the release gate runs
- THEN release is blocked
- AND rollback evidence is required before work continues

#### Scenario: Platform claim lacks native evidence

- GIVEN macOS passes but Windows native installer and journey evidence are incomplete
- WHEN release copy is prepared
- THEN Windows is not listed as supported
- AND macOS evidence cannot be used as a substitute
