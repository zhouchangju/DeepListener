# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-04-runtime-assets |
| Domain | Desktop runtime assets / packaging / readiness |
| Owner | AI Agent |
| Date | 2026-08-04 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Versioned runtime asset manifest and fail-closed Desktop resolver | `src/lib/runtime-asset-manifest.ts`, `desktop/runtime-assets.js`, `desktop/main.js` | Packaged FFmpeg/ffprobe must match platform/architecture and checksum before execution; missing/tampered assets produce a limited readiness state |
| FEAT-002 | Target-aware standalone packager | `scripts/desktop-package.mjs`, `scripts/desktop-preflight.mjs`, `desktop/electron-builder.yml` | Packager selects the correct Prisma engine and emits a checksum-bound manifest only when licensed metadata is present |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Real FFmpeg binaries and `assets.json` provenance | release-owner/licensing input is required |
| OOS-002 | Prisma schema/migrations and active database | no schema change is needed; protected data boundary |
| OOS-003 | Signing, notarization, installer publication, and platform E2E | requires native release environments and credentials |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Legacy Server/development PATH behavior remains available | setup-readiness regression and source contract |
| AC-PRESERVE-002 | Renderer IPC remains path-free and no arbitrary filesystem API is exposed | desktop startup contract |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Manifest validator rejects unsafe paths, malformed checksum, nonfree/GPL inconsistency, and missing capability floor | TypeScript + Electron adapter tests |
| AC-CHANGE-002 | Runtime resolver verifies both binary bytes and refuses partial pairs | Electron adapter test |
| AC-CHANGE-003 | Packager supports darwin-arm64, darwin-x64, win32-x64 engine selection | packaging contract and disposable package run |
| AC-CHANGE-004 | Packaged readiness never probes host PATH after asset rejection | setup-readiness test |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged; missing before sprint |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `public/videos/` | unchanged |
| DATA-SAFE-004 | `.env*` | not edited |

## Commands

| Command | Purpose | Expected Result |
|---|---|---|
| targeted TypeScript contracts | targeted regression | exits 0 |
| `node --test desktop/runtime-assets.test.js` | Electron-side adapter | exits 0 |
| `npm run test:ci` | broader tests | exits 0 |
| `npm run lint` | lint | zero warnings/errors |
| `npm run build` | production build | exits 0 |
| `node scripts/desktop-package.mjs --no-build --staging <disposable>` | target-aware package smoke | current win32-x64 engine accepted; no fake manifest without assets |

## Browser Checks

No browser changes in this sprint; readiness behavior is covered by deterministic dependency-injection tests.

## Stop Conditions

- Protected data changes are not authorized.
- `npm run sync`, `.env*` edits, signing, and release publication are out of scope.
- Real asset provenance must be supplied by the release owner rather than invented by the agent.

## Rollback

| Area | Rollback |
|---|---|
| Code | revert runtime asset/packager files and tests only |
| Data | N/A; disposable staging only |
| Deploy | no release publication; retain existing preflight gate |
