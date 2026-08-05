# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-08-06-desktop-package-ci |
| Mode | Adversarial |
| Owner | AI Agent |
| Date | 2026-08-06 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | exists; not used by workflow | no workflow access | any workflow step reads or writes it |
| DATA-SAFE-002 | `public/uploads/`, `public/videos/` | local-only user data | package exclusion only; no upload | any copy into artifact or delete in checkout |
| DATA-SAFE-003 | `.env*` | not read/edited | CI secrets are not required | adding secret values or printing env |

## Domain Boundary

| Domain | In Scope | Out Of Scope |
|---|---|---|
| Desktop package CI | `.github/workflows/desktop-package.yml`, workflow contract test, OpenSpec evidence | signing, notarization, publishing, FFmpeg/demo approval, active data |

## Preserve / Change / Verify

| ID | Requirement | Evidence |
|---|---|---|
| AC-PRESERVE-001 | Existing CI keeps lint, test:ci, and build as explicit steps. | `src/lib/ci-workflow.test.ts` |
| AC-CHANGE-001 | macOS arm64 and Windows x64 package smoke jobs upload expiring artifacts without publishing. | workflow contract test |

## Stop Conditions

- Do not run `npm run sync` or touch active DB/media.
- Do not add signing, notarization, release upload, or credential-dependent steps.

## Rollback

| Change | Rollback |
|---|---|
| Workflow/test/docs | revert the new files |
