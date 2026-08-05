import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./LanguageToggle.tsx", import.meta.url), "utf8");

test("language toggle writes the opposite locale before starting a fresh document request", () => {
  assert.match(source, /const nextLocale: Locale = locale === "en" \? "zh-CN" : "en"/);
  assert.match(source, /writeLocaleCookie\(nextLocale\)[\s\S]*window\.location\.reload\(\)/);
});

test("language toggle does not merge a new locale tree through an RSC refresh", () => {
  assert.doesNotMatch(source, /from "next\/navigation"/);
  assert.doesNotMatch(source, /^\s*router\.refresh\(\);/m);
});
