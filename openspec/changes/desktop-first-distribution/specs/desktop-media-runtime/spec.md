# Desktop Media Runtime Delta Specification

## ADDED Requirements

### Requirement DMR-001: Preserve supported media behavior (FR-040, FR-046)

Desktop SHALL preserve supported audio, MP4, and WebM import behavior and SHALL prefer valid embedded subtitles before provider transcription.

#### Scenario: Video with embedded subtitles

- GIVEN a supported video contains valid parseable subtitles
- WHEN Desktop imports it
- THEN packaged media tools prepare the audio
- AND subtitle timeline data is used without contacting a transcription provider

#### Scenario: Audio requires transcription

- GIVEN a supported audio file has no transcript data
- WHEN Desktop imports it with a configured provider
- THEN the selected provider generates the sentence timeline

### Requirement DMR-002: Packaged media tools (FR-041, FR-047)

Production Desktop SHALL invoke verified packaged FFmpeg/ffprobe assets selected by platform and architecture and SHALL NOT silently fall back to system PATH.

#### Scenario: No system FFmpeg

- GIVEN the supported machine has no FFmpeg on PATH
- WHEN video import or audio export runs
- THEN the operation succeeds using the packaged binary

#### Scenario: Runtime asset is missing or checksum-invalid

- GIVEN the expected packaged binary is unavailable or invalid
- WHEN readiness or an operation checks it
- THEN the operation is blocked with repair/reinstall guidance

### Requirement DMR-003: Transactional import staging (FR-042, FR-043, NFR-002)

Import SHALL write operation-owned artifacts to staging, promote only complete output, and compensate only artifacts/database changes owned by the failed operation.

#### Scenario: Provider fails after media copy

- GIVEN source media was copied to operation staging
- WHEN transcription fails
- THEN the failed operation's staged artifacts are cleaned or quarantined
- AND existing tracks/media remain unchanged
- AND no completed Track references an incomplete artifact

#### Scenario: Process interrupted before promotion

- GIVEN import is interrupted while staging
- WHEN the application restarts
- THEN staging is recognized as incomplete
- AND it is never shown as a completed library item

### Requirement DMR-004: Stage-aware progress (FR-044)

Import SHALL expose bounded stages for copying, probing, extracting, transcribing, indexing, and completion, with cancellation semantics defined per stage.

#### Scenario: Long transcription

- GIVEN media preparation has completed and provider transcription is active
- WHEN the user views import status
- THEN the current stage is Transcribing rather than an indeterminate generic upload

### Requirement DMR-005: Bounded large-file memory (FR-045, NFR-032)

Desktop import and media serving SHALL stream large files and SHALL NOT require loading the entire file into renderer memory.

#### Scenario: Representative large video

- GIVEN a supported large video within configured limits
- WHEN it is imported
- THEN renderer remains responsive
- AND measured renderer memory does not grow by approximately the complete file size

### Requirement DMR-006: Safe desktop export destination (FR-047)

Desktop SHALL generate exports in staging and atomically promote successful output to a user-selected destination or the data-root export directory.

#### Scenario: Export encoding fails

- GIVEN export processing fails before completion
- WHEN the operation ends
- THEN no destination file is presented as complete
- AND source media remains unchanged
