# Desktop Application Shell Delta Specification

## ADDED Requirements

### Requirement DAS-001: Self-contained desktop runtime (FR-001)

The Desktop application SHALL launch and run without system installations of Node.js, npm, Prisma CLI, FFmpeg, or ffprobe.

#### Scenario: Clean-machine launch

- GIVEN a supported clean machine with no development prerequisites
- WHEN the user installs and launches DeepListener Desktop
- THEN the application reaches its first-run or Library UI using packaged runtime assets

### Requirement DAS-002: Single application instance (FR-002)

The Desktop application SHALL prevent competing instances from opening the same profile.

#### Scenario: Second launch

- GIVEN one healthy DeepListener instance owns the profile
- WHEN the user launches DeepListener again
- THEN the existing window is focused
- AND no second local service or database writer starts

### Requirement DAS-003: Loopback-only service with dynamic port (FR-003, FR-004, NFR-013)

Electron main SHALL start the Next.js standalone service on `127.0.0.1`, select an available port, and establish a per-launch authorization mechanism for privileged desktop requests.

#### Scenario: Preferred port is occupied

- GIVEN another process occupies a candidate port
- WHEN Desktop starts
- THEN it selects another available loopback port and completes startup

#### Scenario: External interface inspection

- GIVEN the service is healthy
- WHEN listeners are inspected
- THEN no DeepListener service listens on a non-loopback interface

#### Scenario: Unauthorized local request

- GIVEN another local process sends a privileged request without valid launch authorization
- WHEN the service evaluates it
- THEN the request is rejected without executing the operation

### Requirement DAS-004: Bounded startup and recovery (FR-005, NFR-020)

Startup SHALL use bounded timeouts and SHALL show a recovery surface when runtime, database, or service health cannot be established.

#### Scenario: Service never becomes healthy

- GIVEN the standalone service process starts but does not pass health checks before timeout
- WHEN startup expires
- THEN the user sees retry, diagnostics, and quit actions
- AND the app does not show a permanent blank window

### Requirement DAS-005: Graceful process lifecycle (FR-006, NFR-021)

Electron main SHALL own service startup and shutdown and SHALL prevent orphan service processes after normal quit.

#### Scenario: Normal application quit

- GIVEN no non-cancellable data operation is active
- WHEN the user quits
- THEN the service stops accepting new work, completes bounded shutdown, and exits

#### Scenario: Unresponsive service on quit

- GIVEN the service does not stop within the graceful timeout
- WHEN Electron completes shutdown handling
- THEN it terminates the owned service process
- AND records a redacted diagnostic event

### Requirement DAS-006: Sandboxed renderer (NFR-010, NFR-011, NFR-012, NFR-014)

BrowserWindow SHALL disable Node integration, enable context isolation and sandboxing, enforce a restrictive content policy, validate IPC senders/payloads, and deny unapproved navigation/window creation.

#### Scenario: Renderer attempts Node access

- GIVEN application content executes in the renderer
- WHEN it attempts to access Node primitives not explicitly exposed by the preload contract
- THEN access is unavailable

#### Scenario: Unapproved navigation

- GIVEN application content attempts to navigate to an unapproved origin
- WHEN Electron receives the navigation event
- THEN navigation is prevented

### Requirement DAS-007: Platform isolation (FR-080, FR-083, FR-084, FR-085, NFR-050, NFR-051)

Operating-system behavior SHALL be isolated behind platform/bootstrap/packaging adapters; shared learning and data contracts SHALL remain platform-independent.

#### Scenario: Windows enablement

- GIVEN the macOS feasibility implementation is complete
- WHEN Windows x64 support is added
- THEN no forked Prisma schema, learning UI, review logic, or API contract is introduced
- AND platform differences remain in approved adapter/build surfaces

#### Scenario: Unsupported Linux platform

- GIVEN Linux has no approved release proposal
- WHEN release documentation is generated
- THEN it does not imply Linux support
