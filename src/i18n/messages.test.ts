import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync(new URL("../../messages/en.json", import.meta.url), "utf8"));
const zhCN = JSON.parse(readFileSync(new URL("../../messages/zh-CN.json", import.meta.url), "utf8"));

function getLeafPaths(obj: unknown, prefix = ""): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (obj === null || typeof obj !== "object") {
    map.set(prefix, obj);
    return map;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [subPath, subValue] of getLeafPaths(value, path)) {
        map.set(subPath, subValue);
      }
    } else {
      map.set(path, value);
    }
  }

  return map;
}

function getIcuVariables(text: string): Set<string> {
  const vars = new Set<string>();
  const regex = /\{(\w+)\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

const enLeaves = getLeafPaths(en);
const zhLeaves = getLeafPaths(zhCN);

test("both locales have the same leaf key set", () => {
  const enKeys = new Set(enLeaves.keys());
  const zhKeys = new Set(zhLeaves.keys());

  const onlyInEn = [...enKeys].filter(k => !zhKeys.has(k));
  const onlyInZh = [...zhKeys].filter(k => !enKeys.has(k));

  assert.deepEqual(onlyInEn, [], "Keys only in en.json");
  assert.deepEqual(onlyInZh, [], "Keys only in zh-CN.json");
});

test("all leaf values are non-empty strings", () => {
  for (const [key, value] of enLeaves) {
    assert.equal(typeof value, "string", `en: ${key} must be a string, got ${typeof value}`);
    assert.notEqual((value as string).trim(), "", `en: ${key} must be non-empty`);
  }
  for (const [key, value] of zhLeaves) {
    assert.equal(typeof value, "string", `zh-CN: ${key} must be a string, got ${typeof value}`);
    assert.notEqual((value as string).trim(), "", `zh-CN: ${key} must be non-empty`);
  }
});

test("same key has identical ICU variable names in both locales", () => {
  for (const key of enLeaves.keys()) {
    const enVal = enLeaves.get(key) as string;
    const zhVal = zhLeaves.get(key) as string;
    if (!zhVal) continue;

    const enVars = getIcuVariables(enVal);
    const zhVars = getIcuVariables(zhVal);

    const onlyInEn = [...enVars].filter(v => !zhVars.has(v));
    const onlyInZh = [...zhVars].filter(v => !enVars.has(v));

    assert.deepEqual(onlyInEn, [], `${key}: variables only in en`);
    assert.deepEqual(onlyInZh, [], `${key}: variables only in zh-CN`);
  }
});

test("key leaves are not objects or undefined", () => {
  for (const [key, value] of enLeaves) {
    assert.equal(typeof value, "string", `en: ${key} should be string`);
  }
  for (const [key, value] of zhLeaves) {
    assert.equal(typeof value, "string", `zh-CN: ${key} should be string`);
  }
});
