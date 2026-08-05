# DeepListener Runtime Asset Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-04-runtime-assets |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | missing | no access | delete, overwrite, migrate, sync without confirmation |
| DATA-SAFE-002 | `public/uploads/` | present, unchanged | metadata/status inspection only | delete, overwrite, sync without confirmation |
| DATA-SAFE-003 | `public/videos/` | present, unchanged | metadata/status inspection only | delete, overwrite, commit, or sync |
| DATA-SAFE-004 | `.env*` | absent/unchanged | no access | edit or print secrets |

## Domain Boundary

| Domain | Files / Routes In Scope | Explicitly Out Of Scope |
|---|---|---|
| Desktop runtime asset validation and packaging | `src/lib/runtime-asset-manifest.ts`, `desktop/runtime-assets.js`, `desktop/main.js`, `scripts/desktop-package.mjs`, `scripts/desktop-preflight.mjs`, `desktop/electron-builder.yml` | Prisma schema/migrations, active data/media, provider/network calls, signing/notarization, real FFmpeg/Demo assets |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Server/development FFmpeg behavior retains explicit env/system PATH fallback | setup-readiness tests and main-process source contract |
| AC-PRESERVE-002 | Packaged Desktop cannot execute an unverified or wrong-platform binary | runtime asset adapter tests and startup contract |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Validate manifest metadata, path safety, license posture, capability floor, platform/arch, and SHA-256 | `runtime-asset-manifest.test.ts`, `desktop/runtime-assets.test.js` |
| AC-CHANGE-002 | Packager selects target-specific Prisma engine and emits asset manifest only with metadata | packaging contract and disposable package run |
| AC-CHANGE-003 | Readiness reports packaged asset failure without host PATH fallback | `setup-readiness.test.ts` |

## Required Verification

| Command / Check | Expected Result |
|---|---|
| targeted TypeScript contracts | exits 0 |
| `node --test desktop/runtime-assets.test.js` | exits 0 |
| `npm run test:ci` | no new failures |
| `npm run lint` | zero warnings/errors |
| `npm run build` | exits 0 |

## Stop Conditions

- Never access, migrate, overwrite, or sync `prisma/dev.db`.
- Never delete, overwrite, or sync `public/uploads/` or `public/videos/`.
- Never edit `.env*` or use real credentials.
- Do not fabricate FFmpeg provenance, checksums, or licensing metadata.
- Do not sign, notarize, publish, or claim cross-platform release readiness.

## Rollback

| Change Type | Rollback Path | Data Safety Notes |
|---|---|---|
| Code | revert only runtime asset/packaging files and tests | no protected data touched |
| Data | N/A | all packaging verification uses disposable staging |
| Deployment | retain the existing preflight gate; no publication | release assets/signing remain external gates |
