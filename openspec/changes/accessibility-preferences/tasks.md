# Accessibility Preferences Tasks

- [x] **P1 Preference contract and translations** — Owner: `src/components/preferences/**`; verified default, stored, invalid, changed, and storage-failure states.
- [x] **P2 Monochrome theme** — Owner: `src/components/theme/**`, `src/app/globals.css`; verified provider default and grayscale token contract.
- [x] **P3 First-session guide** — Owner: `src/components/onboarding/**`; verified progress formatting plus accessible controlled guide, skip, completion, dismissal, and replay integration.
- [x] **P4 Application-shell integration** — Owner: `src/app/layout.tsx`; verified localized header controls, document-language synchronization, and keyboard-native controls.
- [x] **P5 Integration gate** — Owner: integration; scoped tests, full lint/test suite, type check for changed files, dev-server smoke checks, and independent review passed. Production build reached Next's WASM-webpack environment failure after the test suite; no application-source diagnostic was emitted.
