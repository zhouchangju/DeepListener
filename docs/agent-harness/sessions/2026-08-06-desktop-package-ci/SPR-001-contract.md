# DeepListener Sprint Contract

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-06-desktop-package-ci |
| Domain | Deployment / CI |
| Date | 2026-08-06 |

## Scope

| ID | In Scope | Expected Behavior |
|---|---|---|
| FEAT-001 | Non-publishing desktop package smoke workflow | Matrix runs on macOS arm64 and Windows x64, builds standalone package, checks contents, uploads short-retention artifacts, and never publishes/signs. |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Code signing, notarization, release publication, real FFmpeg/demo assets | external approval/assets are not available |

## Required Checks

| Command | Expected |
|---|---|
| `node --import tsx --test src/lib/desktop-package-workflow.test.ts` | pass |
| `npm run lint` | pass |
| `npm run test:ci` | pass, known Windows skips only |

## Data Safety

`prisma/dev.db`, `public/uploads/`, `public/videos/`, and `.env*` remain untouched; CI receives no provider or signing secrets.
