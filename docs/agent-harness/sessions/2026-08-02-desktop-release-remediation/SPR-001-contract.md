# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-02-desktop-release-remediation |
| Domain | Desktop deployment, migrations, Practice UI, PWA compatibility |
| Owner | AI Agent |
| Date | 2026-08-02 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Deterministic migration input and fail-closed desktop boot | `desktop/main.js`, `src/instrumentation.ts`, `src/lib/migration-runner.ts` | A missing/failed migration prevents readiness instead of opening a broken UI |
| FEAT-002 | Complete FSRS schema history | new `prisma/migrations/**/migration.sql` | Fresh databases contain `state`, `reps`, `lapses`, and `lastReview` |
| FEAT-003 | Compact practice workspace | practice page/client, `AudioPlayer`, `NoteEditor` | At 900x600, sentence content and actions remain visible while notes stay usable |
| FEAT-004 | Compact Shadowing and Electron cache cleanup | Shadowing presentation/console, `PWARegistration` | Overlay scrolls at short heights; Electron unregisters old SW state |
| FEAT-005 | Regression evidence | colocated tests and harness evaluator | New failure modes are covered and all gates are reported honestly |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Modify or resolve migration state in `prisma/dev.db` | Protected user data needs a separate approved repair operation |
| OOS-002 | Vendor FFmpeg, implement Keychain, sign/notarize, or record demo audio | Requires external binaries, credentials, licensing decision, or human media |
| OOS-003 | Refactor unrelated pages or visual styles | Keep the remediation surgical |

## Acceptance

| ID | Requirement | Evidence |
|---|---|---|
| AC-001 | `npx tsc --noEmit`, lint, build, and full tests pass | command output |
| AC-002 | Disposable fresh DB contains current ReviewItem fields and Prisma query succeeds | targeted migration/standalone smoke test |
| AC-003 | Missing migration input fails startup | isolated negative-path launch test |
| AC-004 | 900x600 practice screenshot/DOM shows sentence actions inside viewport | Browser check BV-001 |
| AC-005 | Shadowing container is height-bounded and scrollable | targeted test plus browser/static check |
| AC-006 | Protected DB hash remains unchanged | before/after SHA-256 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/practice/demo-listening-001` | Launch against a disposable migrated DB, set 900x600, inspect bounding boxes | Sentence list has positive height and capture controls are visible/reachable |
| BV-002 | Shadowing overlay | Open Shadowing at 900x600 | Bottom actions remain reachable through bounded scrolling |

## Rollback

| Area | Rollback |
|---|---|
| Runtime/migration | Revert the new migration and boot-path source changes before distributing any build |
| UI/PWA | Revert the focused practice, Shadowing, and registration changes |
| Data | No protected data change; remove disposable temp profiles only |
