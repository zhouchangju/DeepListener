# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Contract |
| Session | 2026-07-13-waveform-zoom-ready |
| Domain | Audio |
| Owner | AI Agent |
| Date | 2026-07-13 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Waveform zoom readiness fix | `useWaveSurfer.ts`, `useWaveSurfer.test.ts` | Zoom changes never throw `No audio loaded`; decoded waveforms still zoom |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Media import, persistence, and sync | Runtime hook fix needs no data changes |
| OOS-002 | Audio/video player redesign | Surgical lifecycle correction only |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Zoom applies after decoded data is available | targeted behavior test |
| AC-PRESERVE-002 | Existing audio-player synchronization behavior | existing tests and repo gates |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Media-ready instances without decoded data skip zoom safely | failing-then-passing targeted behavior test |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` and `public/videos/` | unchanged |
| DATA-SAFE-003 | `.env*` | unchanged and unread |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/feature/audio-player/useWaveSurfer.test.ts` | targeted regression | yes | exits 0 |
| `npm run test:ci` | broader regression | yes | exits 0 |
| source-scoped ESLint | lint touched source | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/practice/[id]` | Open affected practice item and change zoom during loading/ready transition if locally reproducible | No runtime error; waveform remains usable |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| Sync, migration, environment, or deployment change needed | Stop |
| Scope expands beyond player hook | Split a new contract |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert hook and targeted test |
| Data | N/A; no writes allowed |
| Deploy | N/A |
