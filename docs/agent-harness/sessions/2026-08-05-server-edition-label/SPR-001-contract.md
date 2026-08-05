# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-server-edition-label |
| Domain | Landing / product copy |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Explicit Server edition label | `src/app/landing-translations.ts` | Both locales state that the self-hosted/server path is for technical operators |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Desktop packaging and support claims | requires separate release evidence |
| OOS-002 | API/provider/runtime configuration | no behavior change needed |

## Preserve / Change / Verify

| ID | Requirement | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing landing CTA and no-key Demo copy remain intact | targeted test and full verify |
| AC-CHANGE-001 | Self-hosted value card says Server / self-hosted and identifies technical users | targeted test |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/page.first-success.test.ts` | targeted regression | yes | exits 0 |
| `npm run verify` | broader regression | yes | exits 0 |
| `git diff --check` | whitespace check | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/` | Read the self-hosted value card in English and Chinese | The card explicitly labels the Server/self-hosted path for technical users |

## Stop Conditions

| Condition | Action |
|---|---|
| Request expands into unsupported platform claims | Stop and keep the claim bounded |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert landing translation and test |
| Data | N/A |
