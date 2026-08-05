# First-Success Accessibility Audit (T310)

Date: 2026-08-04
Status: automated contract evidence pass; manual human gate remains open

## Automated evidence

| Area | Evidence | Result |
|---|---|---|
| Onboarding focus/Escape and reachable bubble | `src/components/onboarding/OnboardingGuide.test.ts` | Pass |
| Setup progressive disclosure and actionable blocked CTA | `src/app/setup/page.structure.test.ts` | Pass |
| Provider labels, selection state, and busy state | `src/app/setup/ProviderConfigDialog.structure.test.ts` | Pass |
| Batch status text for assistive technology | `src/app/library/BatchUploadButton.test.ts` | Pass |
| Reduced-motion CSS contract | `src/components/theme/theme.test.ts` | Pass |
| English/Chinese learner-facing accessible copy | `src/i18n/first-session-language.test.ts` | Pass |

## Manual checks still required

The local browser smoke evidence is recorded in
[browser-smoke-2026-08-04.md](./browser-smoke-2026-08-04.md). It confirms the
bounded routes and focus behavior listed above, but it intentionally does no
close the human acceptance gates below.

- Keyboard-only Demo → Practice → Review in a supported browser.
- Screen-reader announcements for asynchronous import and Demo states.
- 200% zoom and short viewport without two-dimensional scrolling.
- `prefers-reduced-motion` behavior on a real browser profile.
- At least five non-developer English learners completing the first-success
  journey (HG-04).

Automated structure tests are not treated as a substitute for these human
checks; T310 therefore remains open for OFS-009/OFS-010 release acceptance.
