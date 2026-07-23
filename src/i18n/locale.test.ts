import test from "node:test";
import assert from "node:assert/strict";
import { resolveLocale } from "./locale";

test("returns default locale when no inputs are provided", () => {
  assert.equal(resolveLocale(undefined, undefined), "en");
  assert.equal(resolveLocale(null, null), "en");
  assert.equal(resolveLocale(null, ""), "en");
});

test("valid cookie takes priority over Accept-Language", () => {
  assert.equal(resolveLocale("zh-CN", "en-US,en;q=0.9"), "zh-CN");
  assert.equal(resolveLocale("en", "zh-CN,zh;q=0.9"), "en");
});

test("ignores invalid cookie values", () => {
  assert.equal(resolveLocale("fr", "zh-CN"), "zh-CN");
  assert.equal(resolveLocale("", "en"), "en");
  assert.equal(resolveLocale("ja", undefined), "en");
});

test("parses simple Accept-Language headers", () => {
  assert.equal(resolveLocale(undefined, "zh-CN"), "zh-CN");
  assert.equal(resolveLocale(undefined, "en"), "en");
  assert.equal(resolveLocale(undefined, "en-US"), "en");
});

test("parses Accept-Language with quality values", () => {
  assert.equal(resolveLocale(undefined, "fr;q=0.9, zh-CN;q=0.8"), "zh-CN");
  assert.equal(resolveLocale(undefined, "ja;q=1.0, en;q=0.5"), "en");
  assert.equal(resolveLocale(undefined, "zh-CN;q=0.9, en;q=0.5"), "zh-CN");
});

test("maps zh and zh-* variants to zh-CN", () => {
  assert.equal(resolveLocale(undefined, "zh"), "zh-CN");
  assert.equal(resolveLocale(undefined, "zh-TW"), "zh-CN");
  assert.equal(resolveLocale(undefined, "zh-HK"), "zh-CN");
  assert.equal(resolveLocale(undefined, "zh-Hans"), "zh-CN");
});

test("falls back to en for unrecognized languages", () => {
  assert.equal(resolveLocale(undefined, "ja"), "en");
  assert.equal(resolveLocale(undefined, "fr"), "en");
  assert.equal(resolveLocale(undefined, "ja-JP, de-DE;q=0.5"), "en");
});

test("handles empty and whitespace-only headers", () => {
  assert.equal(resolveLocale(undefined, ""), "en");
  assert.equal(resolveLocale(undefined, "   "), "en");
});

test("handles cookie with whitespace", () => {
  assert.equal(resolveLocale(" en ", "zh-CN"), "zh-CN"); // invalid, falls to header
});

test("en-* variants map to en", () => {
  assert.equal(resolveLocale(undefined, "en-GB"), "en");
  assert.equal(resolveLocale(undefined, "en-AU"), "en");
  assert.equal(resolveLocale(undefined, "en-CA"), "en");
});
