# Desktop loopback authorization status — 2026-08-05

This addendum records the local implementation slice for T173. It does not
close packaged Desktop, signing, clean-install, real-OS, or target-learner
external gates.

- Self-check found that `desktop/main.js` injected `DEEPLISTENER_LAUNCH_TOKEN`
  into the standalone service but no server-side request actually validated it.
- Added `src/proxy.ts` and `src/lib/desktop-launch-auth.ts`. Authorization is
  opt-in via `DEEPLISTENER_REQUIRE_LAUNCH_TOKEN=1`, so Server/dev stays usable.
  Missing or incorrect tokens receive a body-less, non-cacheable `401`.
- Electron registers `onBeforeSendHeaders` before the initial `loadURL` and
  injects the token only for its own loopback origin. Health, diagnostics, and
  backup requests made by the main process carry the same header. The token is
  not exposed through preload/IPC, URLs, logs, or diagnostics.
- Evidence: `src/lib/desktop-launch-auth.test.ts`,
  `src/proxy.contract.test.ts`, `desktop/launch-auth-contract.test.js`
  (9/9 targeted tests), and
  `docs/agent-harness/sessions/2026-08-05-desktop-loopback-auth/`.
- Latest `npm run verify`: 529 tests, 527 passed, 2 Windows capability skips,
  0 failures; lint/build and `git diff --check` passed. Build reports
  `ƒ Proxy (Middleware)`. Existing non-blocking Turbopack NFT tracing and Node
  `punycode` deprecation warnings remain.
- Data safety: this session did not change `prisma/dev.db`,
  `public/uploads/`, `public/videos/`, or `.env*`, and did not run
  `npm run sync`.
