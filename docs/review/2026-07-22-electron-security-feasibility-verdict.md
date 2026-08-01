# W0-C — Electron Shell & Security Feasibility (T030/T031/T032/T033)

| Field | Value |
|---|---|
| Req | FR-002..006, NFR-010..014, DAS-002..007 |
| Deps | T000, T010 |
| Verdict | **PASS** |
| Location | `desktop-spike/` (disposable throwaway; NOT production; **archived and removed after W0**) |

> **Archival note (2026-08):** The disposable `desktop-spike/` code that produced
> this verdict has been removed — its security model and lifecycle were promoted
> into the production shell at `desktop/main.js` (see the header comment there:
> *"Security model and lifecycle are inherited from the W0 feasibility spike and
> hardened for production"*). This document is kept as the **decision record**
> for why the Electron shell's trust boundary is shaped the way it is. The
> commands under "Commands" below no longer run verbatim because the spike code
> is gone; they are preserved for reference only.

## What was built

A self-contained Electron 43.2.0 spike installed in `desktop-spike/` (its own
`package.json` / `node_modules`, AUTH-002; never touches the project
`package.json`). It demonstrated the full secure shell lifecycle without any
production integration:

- `main.js` — single-instance lock, dynamic loopback port, per-launch token,
  standalone service spawn + bounded health wait, graceful shutdown,
  sandboxed BrowserWindow, CSP/navigation/permission/IPC policy, recovery
  surface.
- `preload.js` — narrow `contextBridge` exposing only `ping` + `spikeVersion`.
- `security-probe.html` + `main-probe.js` — renderer sandbox assertion page.
- `verify-spike.mjs` — Node-side lifecycle/auth source + live-boot checks.
- `t031-auth-contract.test.ts` — per-launch authorization middleware contract.

## Evidence

### T030 — sandboxed shell lifecycle (DAS-002/003/004/005)

`verify-spike.mjs` + a real headless Electron run:

```
[lifecycle] launchId=df737650-… port=65516 token=REDACTED
[lifecycle] service healthy
```

| Property | Result |
|---|---|
| Single-instance lock (`requestSingleInstanceLock`) | ✔ present; second-instance focuses existing window |
| Dynamic free loopback port | ✔ selected port 65516 (and 65482 in Node test) via `listen(0, "127.0.0.1")` |
| Service bound to 127.0.0.1 only | ✔ `HOSTNAME=127.0.0.1`; no external interface |
| Bounded health wait | ✔ polls `/api/symphony/state` with timeout; failure → recovery surface |
| Graceful shutdown | ✔ SIGTERM then SIGKILL after 3s; no orphan process after quit |
| No orphan process after headless run | ✔ confirmed (`pgrep` clean) |

### T031 — per-launch authorization (NFR-013/DAS-003)

`t031-auth-contract.test.ts` (6/6 pass) + source audit:

| Property | Result |
|---|---|
| Token is 256-bit (`randomBytes(32)`) | ✔ 64 hex chars, distinct per generation |
| Token injected via process env, not persisted | ✔ never written to disk |
| Correct token → authorized | ✔ |
| Missing token → rejected ("missing launch token") | ✔ |
| Wrong token → rejected ("invalid launch token") | ✔ constant-time compare |
| Read (GET/HEAD) public on loopback | ✔ renderer can load pages |
| Token absent from rejection reasons | ✔ serialized rejection contains no token |
| Token never returned to renderer | ✔ IPC `app:ping` returns only `{ok, launchId}` |

### T032 — navigation/CSP/permission/IPC restrictions (NFR-010..014)

`verify-spike.mjs` (source audit, 14/14) + `main-probe.js` (live renderer, 8/8):

| Property | Source audit | Live renderer |
|---|---|---|
| `nodeIntegration: false` | ✔ | ✔ `process` global unavailable |
| `contextIsolation: true` | ✔ | ✔ (bridge works) |
| `sandbox: true` | ✔ | ✔ `require`/`module` unavailable |
| `webSecurity: true` | ✔ | — |
| CSP header applied | ✔ | — |
| Navigation denied unless self-origin | ✔ `will-navigate` preventDefault | — |
| New-window denied (allowlisted external via OS only) | ✔ `setWindowOpenHandler` deny | — |
| Permission handler restricts | ✔ clipboard only | — |
| No generic IPC; sender validated | ✔ | — |
| `ipcRenderer` not directly exposed | — | ✔ |
| Preload exposes only ping + spikeVersion | ✔ | ✔ |
| IPC ping works, no token in response | ✔ | ✔ |
| No `nodeIntegration:true` anywhere | ✔ | — |
| No `contextIsolation:false` anywhere | ✔ | — |
| No `sandbox:false` anywhere | ✔ | — |

### T033 — verdict

No proposal dependency requires renderer Node integration, disabled web
security, unrestricted IPC, or unrestricted navigation. The residual trust
boundary is exactly as designed (AD-002/§4): the renderer is sandboxed; the
main process owns privileged operations; the loopback service requires a
per-launch token for privileged requests; secrets never reach the renderer.

## Stop-condition check (design §14)

| Stop condition | Triggered? |
|---|---|
| Next standalone requires Node privileges in renderer | **No** — sandboxed renderer loads pages fine |
| Prisma cannot be packaged without an uncontrolled dev tree | No (W0-A) |
| Renderer requests Node integration or unrestricted IPC | **No** — all capabilities verified unavailable |

**No W0-C stop condition triggered.**

## Commands (historical — spike code removed, kept for reference)

These commands drove the spike at verification time. The `desktop-spike/`
directory has since been removed; the production shell lives in `desktop/`.
The commands are preserved only to document how the evidence above was
produced.

```bash
# Node-side lifecycle + auth + source audit
DEEPLISTENER_STANDALONE_ROOT=$(pwd)/.next/standalone node desktop-spike/verify-spike.mjs
# Auth middleware contract
node --import tsx --test desktop-spike/t031-auth-contract.test.ts
# Live renderer sandbox probe (headless Electron)
ELECTRON_HEADLESS=1 electron desktop-spike/main-probe.js
# Full shell lifecycle (headless)
DEEPLISTENER_STANDALONE_ROOT=$(pwd)/.next/standalone ELECTRON_HEADLESS=1 electron desktop-spike/.
```

## Protected data after W0-C

- `prisma/dev.db` sha256: `c5183268…a08b1d` (unchanged)
- `public/uploads/` / `public/videos/`: unchanged
- orphan processes: none
- spike confined to `desktop-spike/` (project `package.json` untouched)
