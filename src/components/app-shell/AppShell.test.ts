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

test("learner navigation prioritizes Review, exposes the active route, and shows its due badge", () => {
  assert.ok(source.indexOf('<Link href="/review" data-tour="nav-review"') < source.indexOf('<Link href="/setup" data-tour="nav-setup"'));
  assert.match(source, /NavReviewCount/);
  assert.ok((source.match(/<NavReviewCount \/>/g) ?? []).length >= 2, "desktop and mobile Review links should mount the optional due badge");
  assert.match(source, /className=\{`\$\{navLinkClass\("\/review"\)\} inline-flex w-full cursor-pointer items-center gap-1\.5`\}/);
  assert.match(source, /className=\{`\$\{navLinkClass\("\/library"\)\} w-full cursor-pointer`\}/);
  assert.match(source, /aria-current/);
  assert.match(source, /data-active/);
  assert.match(source, /isNavActive/);
});

test("app shell automatically offers the guide once and allows replay", () => {
  assert.match(source, /isReady && !hasCompleted && pathname !== "\/setup"/);
  assert.match(source, /usePathname/);
  assert.match(source, /onClick=\{\(\) => setIsGuideOpen\(true\)\}/);
  assert.match(source, /onComplete=\{complete\}/);
  assert.match(source, /onSkip=\{skip\}/);
  assert.doesNotMatch(source, /if \(!open && !hasCompleted\)/);
  assert.match(source, /reason === "finish"/);
  assert.match(source, /fetch\("\/api\/demo",\s*\{ method: "POST" \}\)/);
  assert.match(source, /router\.push\(`\/practice\/\$\{data\.trackId\}\?demo=1`\)/);
  assert.match(source, /returnFocusRef=\{guideTriggerRef\}/);
});

test("app shell sends a known database block to Setup instead of a generic dead end", () => {
  assert.match(source, /ApiError/);
  assert.match(source, /error\.code === "DATABASE_NOT_READY"/);
  assert.match(source, /router\.push\("\/setup"\)/);
  assert.match(source, /setupRequired/);
});

test("app shell does not cover an explicit Demo journey with the automatic guide", () => {
  assert.match(source, /useSearchParams/);
  assert.match(source, /searchParams\.get\("demo"\) === "1"/);
  assert.match(source, /\["media", "subtitle"\]\.includes\(searchParams\.get\("import"\)/);
  assert.match(source, /!isExplicitFirstUseJourney/);
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
