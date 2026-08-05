# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-08-05-demo-removal |
| Domain | Data safety / first-session usability |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Remove seeded Demo content from a learner-facing surface | Setup data-safety UI, `DELETE /api/demo` integration, `messages/*.json` | Only show the action when Demo exists; require explicit confirmation; report success/failure without exposing paths or secrets |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Demo audio/provenance replacement | Requires human-approved asset and rights evidence |
| OOS-002 | Database/media deletion implementation | Already owned and tested by the scoped Demo API; UI must not bypass it |

## Preserve / Change / Verify

### Preserve

| ID | Existing Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing Demo API deletion remains the only deletion path and is scoped to Demo-owned rows | `demo-seed.test.ts`, API route tests, source inspection |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Ordinary learners can remove Demo content after use from Setup with clear copy and confirmation | focused component contract test, full verify |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged by implementation/checks |
| DATA-SAFE-002 | `public/uploads/` | unchanged by implementation/checks |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/app/setup/DataSafetyActions.test.ts` | focused regression | yes | exits 0 |
| `npm run lint` | repository lint | yes | exits 0 |
| `npm run verify` | full quality gate | yes | exits 0 |

## Browser Check

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/setup` | With a seeded Demo, open data safety and choose remove; cancel once, then confirm | Cancel leaves Demo untouched; confirmation calls the scoped delete action and reports a localized result |

## Rollback

Revert only the UI, translation, test, and session files. No data rollback is necessary because the implementation does not delete data directly.
