# DeepListener Evaluator Report

## Observation

| Field | Value |
|---|---|
| status | accepted-for-scoped-sprint |
| summary | Runtime asset manifest validation, target-aware Prisma packaging, checksum verification, and packaged fail-closed FFmpeg resolution are implemented and verified. |
| next_actions | Supply licensed target binaries/metadata, run native clean-install/package QA, and complete signing/release gates before claiming Desktop distribution readiness. |
| artifacts | `src/lib/runtime-asset-manifest.ts`, `desktop/runtime-assets.js`, `scripts/desktop-package.mjs`, `scripts/desktop-preflight.mjs`, focused tests |

## Scope Reviewed

| Field | Value |
|---|---|
| Sprint contract | `SPR-001-contract.md` |
| Safety profile | `legacy-safety-profile.md` |
| Domain | Desktop runtime assets / packaging / readiness |
| Date | 2026-08-04 |
| Evaluator | AI Agent |

## Contract Checklist

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| AC-PRESERVE-001 | Server/development PATH behavior remains available | pass | existing readiness tests plus development branch in `desktop/main.js` |
| AC-PRESERVE-002 | Renderer has no arbitrary filesystem or path IPC | pass | `src/lib/desktop-startup-contract.test.ts` |
| AC-CHANGE-001 | Manifest structure/semantics are validated | pass | TypeScript manifest tests cover checksum, traversal, license, nonfree, capability floor, duplicates |
| AC-CHANGE-002 | Runtime resolver verifies both binaries and checksums | pass | `desktop/runtime-assets.test.js` verified pair and tamper rejection |
| AC-CHANGE-003 | Packager is target-aware | pass | packaging contract and disposable `win32-x64` smoke accepted `query_engine-windows.dll.node` |
| AC-CHANGE-004 | Packaged failure does not probe host PATH | pass | setup-readiness tests assert zero command probes for `missing` status |

## Data Safety

| Check | Result | Evidence |
|---|---|---|
| `prisma/dev.db` unchanged or approved | pass | path absent before/after; packaging staging used separate directory |
| `public/uploads/` unchanged or approved | pass | working-tree metadata unchanged |
| `public/videos/` unchanged or approved | pass | working-tree metadata unchanged |
| `.env*` not edited | pass | no `.env*` changes |
| `npm run sync` not run or approved | pass | command not run |

## Command Verification

| Command | Result | Evidence |
|---|---|---|
| targeted TypeScript contracts | pass | 26 tests, 0 failures |
| `node --test desktop/runtime-assets.test.js` | pass | 2 tests, 0 failures |
| `npm run test:ci` | pass | 442 tests, 440 passed, 2 environment-limited skips, 0 failures |
| `npm run lint` | pass | zero warnings/errors |
| `node --check` for touched JS/MJS | pass | main, runtime adapter, package and preflight scripts parse successfully |
| disposable package smoke | pass | `win32-x64` target selected current Windows Prisma engine; absent FFmpeg assets did not create a fake manifest |
| `npm run build` | pass | production build exits 0; known Turbopack NFT tracing warning remains non-blocking |

## Findings

| ID | Severity | Area | Finding | Required Action |
|---|---|---|---|---|
| EV-001 | accepted-deviation | release assets | No real redistributable FFmpeg/ffprobe binaries or provenance metadata are present in the repository | Release owner must supply per-target binaries and `assets.json`; preflight remains fail-closed |
| EV-002 | follow-up | native platform QA | Current environment is Windows; macOS clean-install, signing, notarization, and installer QA are not proven | Run platform-specific gates in native environments |
| EV-003 | follow-up | disposable staging | `.build-temp-runtime-assets` and verify-temp outputs could not be removed because the environment policy blocked cleanup commands | Treat them as disposable generated output; do not include or sync them |

## Acceptance

| Feature ID | Accepted? | Reason |
|---|---|---|
| FEAT-001 | yes, scoped | Manifest and fail-closed resolver behavior is complete and tested; real release assets remain external. |
| FEAT-002 | yes, scoped | Target-aware packaging and manifest emission rules are implemented; native package/signing QA remains open. |

## Handoff Notes

- The packaged Electron branch requires `runtime/assets.manifest.json` and refuses host PATH fallback when it is absent or invalid.
- `scripts/desktop-package.mjs` accepts `DEEPLISTENER_TARGET_PLATFORM` and `DEEPLISTENER_TARGET_ARCH` for an already-provisioned target; it does not download or invent binaries.
- The public preflight still intentionally fails without real per-target FFmpeg/ffprobe assets, complete metadata, and approved Demo provenance.
