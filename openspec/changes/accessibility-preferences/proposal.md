# Accessibility Preferences Proposal

## Why

DeepListener currently exposes English-only chrome and a system-following colored theme. A learner should be able to use the product shell in Chinese, select an intentionally monochrome light or dark presentation, and receive a short, unobtrusive first-session orientation.

## Scope

- Add a persisted English/Chinese product-shell preference. English is the default.
- Add an explicit monochrome light/dark theme preference, persisted per browser.
- Add a first-visit guide that introduces Library, Setup, practice, and review; it is skippable and can be replayed.
- Localize the application shell, landing page, controls introduced by this change, and the guide. Existing learning content, user media, transcripts, and API payloads are not translated.

## Non-goals

- Locale-prefixed URLs, automatic browser-language detection, machine translation, server-side user profiles, or translation of user-created content.
- A third visual theme or changes to persisted learning data.

## Rollback

All preferences are browser-local. Removing the new providers reverts to English and the existing default presentation without touching user media or database records.
