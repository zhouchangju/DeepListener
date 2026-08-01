# Desktop Lifecycle and Recovery Delta Specification

## ADDED Requirements

### Requirement DLR-001: Automatic first-run initialization (FR-020)

Desktop SHALL initialize a new compatible local database without terminal commands and SHALL make initialization idempotent.

#### Scenario: Empty profile

- GIVEN no desktop database exists
- WHEN the application starts
- THEN it creates the database through versioned migrations
- AND records the resulting schema/application compatibility state

#### Scenario: Restart after initialization

- GIVEN initialization completed successfully
- WHEN the application restarts
- THEN completed migrations are not reapplied

### Requirement DLR-002: Backup before migration/update (FR-050, FR-072, NFR-001)

Before any schema-changing migration or update, the system SHALL create and validate a recoverable backup. Failure to create/validate the backup SHALL block the write.

#### Scenario: Insufficient disk for backup

- GIVEN a schema migration is required but available disk is insufficient
- WHEN preflight runs
- THEN migration/update is not started
- AND current application/data remain usable

### Requirement DLR-003: Idempotent versioned migration (FR-051)

Migration SHALL be versioned, idempotent, offline-capable, and record completion only after verification.

#### Scenario: Restart during migration

- GIVEN the process stopped before migration completion was recorded
- WHEN the application restarts
- THEN it detects incomplete migration state
- AND resumes safely or enters recovery without assuming success

### Requirement DLR-004: Recoverable migration failure (FR-052, NFR-022)

A failed migration SHALL preserve or restore the previous known-good database and SHALL provide a bounded recovery path.

#### Scenario: Migration SQL fails

- GIVEN a verified pre-migration backup exists
- WHEN migration fails
- THEN the new database is not activated
- AND the user can continue with or restore the previous compatible state according to policy

### Requirement DLR-005: Copy-first legacy import (FR-053)

Legacy Server data import SHALL discover and copy source database/media, verify the copy, migrate the copy, and leave source files untouched.

#### Scenario: Import active legacy library

- GIVEN a valid legacy database and media roots are selected
- WHEN import completes
- THEN target counts/media manifest satisfy defined invariants
- AND source database/media metadata and contents are unchanged

#### Scenario: Copy verification fails

- GIVEN one required media file cannot be copied or verified
- WHEN legacy import validates staging
- THEN target is not activated
- AND the source remains the operational fallback

### Requirement DLR-006: Complete backup and validated restore (FR-054, FR-055)

Users SHALL create a manifest-backed backup containing the database and required media, and restore SHALL validate format, integrity, compatibility, disk space, and conflicts before activation.

#### Scenario: Corrupt backup

- GIVEN a backup database checksum or required media manifest is invalid
- WHEN restore preflight runs
- THEN restore is rejected before replacing active state

#### Scenario: Valid restore with existing data

- GIVEN active local data exists and the backup is valid
- WHEN the user chooses restore
- THEN exact replacement/merge policy and impact are confirmed
- AND current data is backed up before activation

### Requirement DLR-007: Cross-platform backup portability (FR-056)

Backup contents SHALL use relative portable identifiers and SHALL restore between supported macOS and Windows versions within the declared compatibility window.

#### Scenario: macOS backup restored on Windows

- GIVEN a compatible backup produced on macOS
- WHEN Windows Desktop restores it
- THEN database, media, notes, review state, and study history resolve under Windows AppData

### Requirement DLR-008: Uninstall data retention (FR-057)

Desktop uninstall SHALL NOT silently remove user data, and removal instructions SHALL identify the separate data directory.

#### Scenario: Application uninstall

- GIVEN the user uninstalls the application using the platform installer
- WHEN uninstall completes
- THEN the user data directory remains unless an explicit separately confirmed removal option was selected
