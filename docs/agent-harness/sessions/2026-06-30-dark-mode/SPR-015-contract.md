# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-015 |
| Mode | Contract |
| Session | 2026-06-30-dark-mode |
| Domain | Global UI Theme |
| Owner | AI Agent |
| Date | 2026-06-30 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | System-aware theme provider | `src/components/theme/ThemeProvider.tsx`, `src/app/layout.tsx` | App defaults to operating-system theme and writes `.dark` to `html` for dark mode |
| FEAT-002 | Top-right theme toggle | `src/components/theme/ThemeToggle.tsx`, `src/app/layout.tsx` | Header exposes one icon button that toggles between light and dark |
| FEAT-003 | Dark visual treatment | `src/app/globals.css`, `src/app/**`, `src/components/**` | Main Library, Practice, Shadowing, Vault, Review, Dashboard, dialogs, editors, and common controls render coherently in dark mode |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Prisma/data migrations | Theme work does not need schema or persisted-data changes |
| OOS-002 | Audio/transcription behavior | Visual theme must not alter audio processing |
| OOS-003 | Remote sync/deployment config | User requested local UI behavior only |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | Existing light style remains the light theme | source review and browser light check |
| AC-PRESERVE-002 | Existing tests and build still pass | targeted tests, lint, build, test:ci |
| AC-PRESERVE-003 | Protected data untouched | git status for protected paths |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Default theme follows system preference | provider props: `defaultTheme="system"`, `enableSystem`, `attribute="class"` |
| AC-CHANGE-002 | Header includes day/night icon toggle | ThemeToggle source and browser check |
| AC-CHANGE-003 | Dark mode covers core routes and modal surfaces | source scan plus browser checks for light/dark |

### Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged unless explicitly approved |
| DATA-SAFE-002 | `public/uploads/` | unchanged unless explicitly approved |
| DATA-SAFE-003 | `.env*` | not edited |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `node --import tsx --test src/components/theme/theme.test.ts ...` | targeted regression | yes | exits 0 |
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production build | yes | exits 0 |
| `npm run test:ci` | broader regression | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | `/library` | Open route, inspect default/light/dark header and cards | Toggle appears top-right; surfaces switch without white page shell |
| BV-002 | `/vault` | Open route and toggle dark | Filters, list containers, pagination, and export controls remain readable |
| BV-003 | `/dashboard` | Open route and toggle dark | Dashboard cards, logs, and chart containers remain readable |

## Stop Conditions

| Condition | Action |
|---|---|
| Protected data change needed | Stop and ask for explicit confirmation |
| `npm run sync` needed | Stop and ask for explicit confirmation |
| `.env*` edit needed | Stop and ask user to edit |
| Required command unavailable | Document environment boundary and continue only with equivalent evidence |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert theme provider/toggle, globals, and touched UI files |
| Data | N/A |
| Deploy | N/A |
