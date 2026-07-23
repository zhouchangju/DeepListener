# SPR-001 Evaluator Report — i18n Migration

Date: 2026-07-23
Contract: SPR-001-contract.md
Mode: Adversarial

## Summary

Phase A (Infrastructure & core consumers) is **complete**. Phases B-D are **partially complete** — the data-decoupling infrastructure is in place but not all modules have had their hardcoded text migrated.

## Blocker / Must-Fix

- None. `npm run verify` passes clean (304/304).

## High-Risk Observations

1. **next-intl SWC warnings** — `Cannot find module './swc.wasi.cjs'` appears during build but is non-fatal; Next.js 16 + next-intl has a known benign SWC resolution path issue. Does not affect runtime.

2. **Remaining hardcoded UI text** — The residual audit found user-visible hardcoded strings in dashboard, setup, library, vault, review, practice, and feature components. These need Phase C completion.

3. **`toLocaleString` usage** — Multiple components use `toLocaleDateString()` without locale parameter (will use browser default, not app locale). Phase C should replace with next-intl formatters.

4. **Vault export route** — Uses `new Date().toLocaleString()` without locale; export file headers remain hardcoded English. Phase C task.

## What Was Changed

### Phase A (Complete)
- Installed `next-intl`
- Wrapped `next.config.ts` with `createNextIntlPlugin`
- Created `src/i18n/config.ts`, `locale.ts`, `request.ts`, `client.ts`
- Created `src/i18n/locale.test.ts` (10 tests) and `messages.test.ts` (4 tests)
- Created `src/types/next-intl.d.ts` (type augmentation)
- Created `messages/en.json` and `messages/zh-CN.json` (18 namespaces, ~450 keys each)
- Created `src/components/i18n/LegacyLocaleMigrator.tsx`
- Created `src/lib/track-taxonomy.ts` (stable value + message key presets)
- Converted `src/app/layout.tsx` to async server component with `NextIntlClientProvider`
- Migrated `LanguageToggle.tsx` to `useLocale()` + `writeLocaleCookie()` + `router.refresh()`
- Migrated `ThemeToggle.tsx` to `useTranslations("theme")`
- Migrated `AppShell.tsx` to `useTranslations("nav")` and `useTranslations("onboarding")`
- Migrated `OnboardingGuide.tsx` to use `useTranslations("onboarding")` directly (removed custom translator prop)
- Migrated `src/app/page.tsx` (landing) to `useLocale()` + `landing-translations.ts`
- Migrated `src/app/library/LibraryManager.tsx` to `useTranslations` + `track-taxonomy`
- Migrated `src/components/feature/RenameTrackModal.tsx` to `useTranslations` + `track-taxonomy`
- Migrated `src/app/error.tsx`, `not-found.tsx`, `global-error.tsx` to localized text
- Updated `src/app/dashboard/chart-theme.ts` — `getStatusColor()` now takes `TrackStatus` enum
- Updated `src/app/dashboard/StatsCharts.tsx` — `StatusRingChart` uses `StatusDatum` type
- Updated all affected tests
- Deleted `PreferencesProvider.tsx` and `preferences.test.ts`

### Phase B (Partial)
- ✅ Chart status → `TrackStatus` enum
- ✅ Type/topic → `track-taxonomy.ts` presets  
- ✅ Domain message keys mapping
- ✅ API error infrastructure (`upload-error.ts` returns codes)
- ⚠️ `domain-constants.ts` `TRACK_STATUS_LABELS` still present (used by TrackList.tsx — Phase C)
- ⚠️ `setup-readiness.ts` still returns English strings directly (Phase C)
- ⚠️ `analytics.ts` `formatDuration` still concatenates English units (Phase C)
- ⚠️ `toLocaleDateString` calls not yet replaced (Phase C)

## Completed Acceptance Criteria

- [x] `npm run verify` passes (304/304 tests, build compiles)
- [x] Zero `usePreferences`/`PreferencesProvider` residual
- [x] Locale resolver tests pass (cookie/Accept-Language/fallback/q-value)
- [x] Message symmetry tests pass (leaf keys, non-empty strings, ICU variables)
- [x] next-intl type augmentation applied
- [x] without i18n routing — no middleware, no `[locale]` routes
- [x] `next.config.ts` wrapped with `createNextIntlPlugin`
- [x] Root layout converted to async with `NextIntlClientProvider`
- [x] global-error has independent en/zh-CN fallback
- [x] Protected data untouched (no db/media/env changes)

## Remaining Work

See `docs/plans/2026-07-23-i18n-migration-plan.md` for the full scope.

### Phase C Priority
1. Setup page (lots of hardcoded English)
2. Review page (card labels, empty states)
3. Practice page (status labels, tooltips)
4. Vault (filters, sort options, empty states)
5. Dashboard (all chart labels, section headers, stat cards)
6. Feature components (AudioPlayer, ShadowingConsole, notation)
7. Shared UI primitives (dialog Close button)
8. API public errors and vault/library export routes
9. Replace `toLocaleDateString` with next-intl formatters

### Phase D Priority
1. Full residual audit with manual classification
2. Update `CLAUDE.md` with i18n dev commands
3. Update `openspec/changes/accessibility-preferences/proposal.md`
4. Smoke test matrix (browser + standalone)

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Hardcoded text in un-migrated modules | Medium | Phase C planned; current behavior falls back to English |
| `toLocaleString` in vault export | Low | Export works but uses browser-default locale |
| `TRACK_STATUS_LABELS` still has mixed zh/en text | Low | Used by TrackList.tsx only; to be replaced in Phase C |
