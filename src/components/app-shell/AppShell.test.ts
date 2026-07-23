import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");

test("app shell localizes the global navigation and mounts all preference controls", () => {
  assert.match(source, /useTranslations\(/);
  assert.match(source, /<LanguageToggle \/>/);
  assert.match(source, /<ThemeToggle \/>/);
  assert.match(source, /navT\("library"\)/);
  assert.match(source, /navT\("review"\)/);
});

test("app shell automatically offers the guide once and allows replay", () => {
  assert.match(source, /isReady && !hasCompleted/);
  assert.match(source, /onClick=\{\(\) => setIsGuideOpen\(true\)\}/);
  assert.match(source, /onComplete=\{complete\}/);
  assert.match(source, /onSkip=\{complete\}/);
  assert.match(source, /if \(!open && !hasCompleted\)/);
});

test("app shell no longer manually syncs document language", () => {
  assert.doesNotMatch(source, /document\.documentElement\.lang = locale/);
});

test("landing content uses next-intl locale", () => {
  const landingSource = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");

  assert.match(landingSource, /useLocale/);
  assert.match(landingSource, /landing-translations/);
  // Landing text moved to landing-translations.ts
  const translationsSource = readFileSync(new URL("../../app/landing-translations.ts", import.meta.url), "utf8");
  assert.match(translationsSource, /拆解没听懂的那一句/);
});
