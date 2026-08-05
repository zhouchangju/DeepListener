# DeepListener Sprint Contract

## Sprint Metadata

| Field | Value |
|---|---|
| Sprint ID | SPR-001 |
| Mode | Adversarial |
| Session | 2026-08-05-desktop-loopback-auth |
| Domain | Deployment / API authorization |
| Owner | AI Agent |
| Date | 2026-08-05 |

## Scope

| ID | In Scope | Files / Routes | Expected Behavior |
|---|---|---|---|
| FEAT-001 | Per-launch Desktop loopback authorization | `src/proxy.ts`, `src/lib/desktop-launch-auth.ts`, `desktop/main.js` | Desktop explicitly enables a random per-launch token; renderer-origin requests and main-process calls carry it; missing/wrong external local requests get body-less 401 |

## Out Of Scope

| ID | Exclusion | Reason |
|---|---|---|
| OOS-001 | Signed installers, clean-install E2E, real macOS/Windows validation | external release gates, not locally verifiable here |
| OOS-002 | Provider credentials, database/media fixtures, `.env*` | protected data and unrelated domain |

## Preserve / Change / Verify

### Preserve

| ID | Existing Behavior / Data / Constraint | Evidence Required |
|---|---|---|
| AC-PRESERVE-001 | No token requirement unless `DEEPLISTENER_REQUIRE_LAUNCH_TOKEN=1` and a token exists | `desktop-launch-auth.test.ts`, `proxy.contract.test.ts` |
| AC-PRESERVE-002 | Token is never returned by IPC/preload or logged | `launch-auth-contract.test.js`, existing startup contract |

### Change

| ID | Improvement | Evidence Required |
|---|---|---|
| AC-CHANGE-001 | Protect every Next route in Desktop mode through `src/proxy.ts` | build reports Proxy; proxy contract |
| AC-CHANGE-002 | Add header injection before initial BrowserWindow navigation and to health/internal fetches | Electron contract |

## Data Safety

| ID | Path / Resource | Required Status |
|---|---|---|
| DATA-SAFE-001 | `prisma/dev.db` | unchanged |
| DATA-SAFE-002 | `public/uploads/` | unchanged |
| DATA-SAFE-003 | `.env*` | not edited or exposed |

## Commands

| Command | Purpose | Required? | Expected Result |
|---|---|---|---|
| `npm run lint` | lint | yes | exits 0 |
| `npm run build` | production proxy integration | yes | exits 0 |
| `node --import tsx --test src/lib/desktop-launch-auth.test.ts src/proxy.contract.test.ts desktop/launch-auth-contract.test.js` | targeted auth tests | yes | exits 0 |
| `npm run test:ci` | full regression gate | yes | exits 0 |
| `git diff --check` | whitespace | yes | exits 0 |

## Browser Checks

| ID | Route | Steps | Expected Result |
|---|---|---|---|
| BV-001 | Desktop standalone origin | external request without header, Electron-origin request with injected header | external request rejected; app request can load (requires packaged/desktop runtime, not available in this local session) |

## Rollback

| Area | Rollback |
|---|---|
| Code | revert only the auth/proxy/main/test/doc changes |
| Data | N/A; no data mutation |
| Deploy | N/A; no signing or package publication |
