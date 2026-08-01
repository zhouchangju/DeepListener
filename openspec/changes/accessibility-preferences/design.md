# Accessibility Preferences Design

## Decisions

1. A small client-side `PreferencesProvider` owns locale and guide state. It uses versioned localStorage keys and renders a stable English/default state before hydration.
2. Translation is a typed dictionary for product-owned UI. Client components consume `usePreferences`; server-rendered route bodies remain unchanged unless explicitly converted, avoiding a broad and risky refactor.
3. The existing `next-themes` provider remains responsible for the dark class and persistence. Its default is changed from system to light, and CSS tokens become neutral grayscale so both modes are black-and-white.
4. The guide is a focus-trapped modal. It automatically opens once for a browser, never blocks navigation, and can be replayed from the header. Completion and dismissal both suppress automatic reopening.

## Failure handling

- Malformed or unavailable localStorage falls back to English, light, and an eligible guide state.
- SSR never reads browser storage.
- The guide uses semantic dialog controls and Escape dismissal, so keyboard and screen-reader users retain control.

## Acceptance requirements

- **PREF-001** Given a new browser, when the app loads, then chrome is English and the light grayscale theme is used.
- **PREF-002** Given either locale, when the language control is activated, then product chrome and guide text switch immediately and remain after reload.
- **PREF-003** Given either theme, when the theme control is activated, then the document mode changes immediately, persists after reload, and uses grayscale semantic tokens.
- **PREF-004** Given a first visit, when the app becomes interactive, then the guide opens once and a learner can advance, skip, or finish it with keyboard-accessible controls.
- **PREF-005** Given a dismissed or completed guide, when the learner selects the guide control, then the guide reopens from its first step.
- **PREF-006** Given unavailable browser storage, when preferences are used, then the app remains usable with defaults and does not throw.
