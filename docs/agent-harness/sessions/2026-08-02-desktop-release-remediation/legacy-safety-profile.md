# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-02-desktop-release-remediation |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-02 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | Exists; SHA-256 `39d4be3d693db0a68f2dbd1b84b7d9a2f99066ac0da8711242cb2f11caf715dd`; contains the current FSRS state columns | Read-only inspection and hash verification | Delete, overwrite, migrate, sync, or resolve migration state without explicit confirmation |
| DATA-SAFE-002 | `public/uploads/` | Exists | Read-only inspection | Delete, overwrite, or sync |
| DATA-SAFE-003 | `public/videos/` | Exists | Read-only inspection | Delete, overwrite, commit, or sync |
| DATA-SAFE-004 | `.env*` | Present as local runtime input | Do not inspect values | Edit, print, or commit |

## Runtime And Deployment Assumptions

| ID | Assumption | Evidence | Impact |
|---|---|---|---|
| RUN-001 | Electron spawns the Next standalone server with an explicit data root | `desktop/main.js` | Desktop migration inputs must be passed into that child process |
| RUN-002 | Standalone packaging copies migrations to `<standalone>/prisma/migrations` | `scripts/desktop-package.mjs` | Runtime migration path can be deterministic |
| RUN-003 | The active local development DB already has FSRS state columns without a matching checked-in migration | read-only `PRAGMA table_info(ReviewItem)` | Add a forward migration, but do not apply or resolve it against the protected DB in this sprint |
| RUN-004 | Electron minimum window is 900x600 | `desktop/main.js` | Practice and Shadowing controls must remain reachable at that viewport |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Desktop boot and offline migrations | `desktop/main.js`, `src/instrumentation.ts`, `src/lib/migration-runner*`, `prisma/migrations/**`, packaging/runtime tests | Mutating `prisma/dev.db`, sync, backup restore, signing/notarization |
| Practice viewport, Electron PWA cleanup, and desktop credential storage | practice page/client, `AudioPlayer`, `NoteEditor`, Shadowing presentation, `PWARegistration`, `src/lib/secrets-store.ts`, targeted tests | Broader visual redesign, FFmpeg binary acquisition, demo recording, signing/notarization |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing local DB and media remain byte-for-byte untouched | before/after DB hash and Git status |
| AC-PRESERVE-002 | Web/PWA registration remains enabled outside Electron | targeted PWA source test |
| AC-PRESERVE-003 | Existing practice, review, and migration tests remain green | targeted and full test suites |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Fresh desktop profile applies every migration and is queryable with the current Prisma Client | disposable standalone launch smoke test |
| AC-CHANGE-002 | Migration or schema initialization failure prevents desktop service readiness | instrumentation and desktop contract tests |
| AC-CHANGE-003 | Practice sentence controls and Shadowing actions remain reachable at 900x600 | real-browser viewport check |
| AC-CHANGE-004 | Electron unregisters old service workers and removes DeepListener caches | targeted source test |

## Stop Conditions

- Do not run `prisma migrate dev`, `prisma migrate resolve`, or any write against `prisma/dev.db`.
- Do not run `npm run sync` or touch user media.
- Do not edit `.env*` or credential files.
- Do not claim redistributable FFmpeg, real demo audio, signing, or notarization are completed. The Keychain backend is implemented, but its native write path still needs a manual smoke on a clean macOS profile.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code and migration files | Revert only this session's source and migration diff | No protected DB rollback should be necessary |
| Disposable verification data | Delete the explicit `/tmp/deeplistener-*` test directory | Contains generated test data only |
| Protected data | No change authorized | Hash must match the pre-sprint value |
