# DeepListener macOS Alpha Release Contract

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Domain | Desktop release |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Contract

| ID | Requirement | Evidence |
|---|---|---|
| FEAT-001 | Publish `v0.3.0-alpha.1` from current `main` | commit, annotated tag, remote parity |
| AC-001 | Produce an unsigned arm64 DMG with matching version | artifact name and SHA-256 |
| AC-002 | Preserve protected local data and secrets | before/after metadata and Git status |
| AC-003 | Keep alpha limitations explicit | preflight warnings, README, GitHub prerelease |
| AC-004 | Pass repository and package gates | `npm run verify`, package audit, artifact checks |

## Stop conditions

- Do not run `npm run sync`, Prisma migrations, or protected-data writes.
- Do not edit `.env*`, weaken gates, or claim signing/notarization.
- Do not publish if the version, tag, artifact name, or tested commit diverge.

## Rollback

- Local metadata: revert the release commit.
- Remote publication: remove the GitHub prerelease and remote tag if invalid.
- Protected data: N/A; the release pipeline must not touch it.
