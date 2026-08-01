# Portable Data Runtime Delta Specification

## ADDED Requirements

### Requirement PDR-001: Explicit writable data root (FR-010, FR-011, FR-013)

The system SHALL resolve all mutable runtime state beneath one explicit data root and SHALL treat packaged application resources as read-only. The Server edition SHALL support an explicit configured root and a documented legacy fallback.

#### Scenario: Desktop selects OS data directory

- GIVEN Electron has resolved the current user's application data directory
- WHEN the local service starts
- THEN database, media, exports, backups, logs, settings, and runtime state resolve beneath that directory
- AND no mutable path resolves inside the installed application bundle

#### Scenario: Server retains legacy compatibility

- GIVEN no explicit data root is configured in Server edition
- WHEN runtime paths are resolved
- THEN the documented legacy database and media locations remain available
- AND readiness identifies that the legacy layout is in use

### Requirement PDR-002: Portable stored media identity (FR-012)

The system SHALL persist a portable media identifier or storage key rather than a machine-specific absolute path for newly managed desktop media.

#### Scenario: Restore under another root

- GIVEN a valid backup was created on one supported platform
- WHEN it is restored beneath a different valid data root
- THEN stored audio and video resolve without rewriting absolute source-machine paths

### Requirement PDR-003: Root containment and traversal safety (FR-014, NFR-002)

Every storage read, write, delete, restore, and export source operation SHALL validate containment inside its allowed root before filesystem access.

#### Scenario: Encoded traversal is rejected

- GIVEN a media identifier contains encoded parent traversal or an absolute external path
- WHEN the storage service resolves it
- THEN the request is rejected before filesystem access
- AND no external file metadata or content is returned

#### Scenario: Symlink escape is rejected

- GIVEN a path inside the media directory resolves through a symlink outside the allowed root
- WHEN the service validates the canonical path
- THEN the operation is rejected

### Requirement PDR-004: Byte-range media service (FR-015, NFR-033)

The system SHALL stream stored audio and video with correct HTTP range semantics without buffering the complete file.

#### Scenario: Valid range request

- GIVEN a stored media file of known length
- WHEN the client requests a satisfiable byte range
- THEN the service returns `206`, correct `Content-Range`, `Content-Length`, MIME type, and `Accept-Ranges: bytes`
- AND streams only the requested range

#### Scenario: Unsatisfiable range

- GIVEN a request starts beyond the stored media length
- WHEN the range is parsed
- THEN the service returns `416` with the valid total length

#### Scenario: Full media request

- GIVEN no range header is present
- WHEN the client requests a valid media identifier
- THEN the service streams the complete file with `200` and correct length

### Requirement PDR-005: Explicit incomplete/missing media behavior (NFR-003)

The system SHALL report missing or invalid media and SHALL NOT silently produce partial playback or incomplete exports.

#### Scenario: Required source is missing

- GIVEN a database record references media that is absent
- WHEN playback or export is requested
- THEN the operation fails with a safe, actionable missing-media result
- AND no output is presented as complete

### Requirement PDR-006: Atomic mutable metadata writes (NFR-001, NFR-002)

Settings, manifests, and generated runtime state SHALL be written through a temporary file and atomic promotion where supported.

#### Scenario: Interrupted settings write

- GIVEN a valid existing settings file
- WHEN writing a replacement is interrupted before promotion
- THEN the existing settings remain readable
- AND the incomplete temporary file is not treated as active state
