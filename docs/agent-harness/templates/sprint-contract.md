# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract / Adversarial |
| Session | YYYY-MM-DD-short-name |
| Domain | Shadowing / Vault / Review / Dashboard / API / Audio / Deployment / Quality Gate |
| Owner | AI Agent / Human |
| Date | YYYY-MM-DD |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | [improvement] | [paths] | [behavior] |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | [domain/file/behavior not touched] | [why] |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | [must remain true] | [test/browser/data check] |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | [specific change] | [test/browser/data check] |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test <paths>` | targeted regression | yes | exits 0 |
| `npm run test:ci` | broader tests | if touched area warrants | exits 0 |
| `npm run lint` | lint | important changes | exits 0 |
| `npm run build` | production build | release/deploy-sensitive changes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/target-route` | [steps] | [expected behavior] |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Sprint expands into another domain | Stop and split a new contract |
| Required command unavailable | Document environment boundary and decide whether degraded mode is acceptable |

## Rollback

| Area | Rollback |
|---|---|
| Code | [revert files/commit] |
| Data | [backup restore path or N/A] |
| Deploy | [config rollback or N/A] |
