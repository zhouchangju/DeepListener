import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./SentenceList.tsx", import.meta.url), "utf8");

test("sentence actions keep accessible names and add visible desktop labels", () => {
  assert.equal((source.match(/aria-label=\{labels\.shadowing\}/g) ?? []).length, 2);
  assert.equal((source.match(/aria-label=\{labels\.copy\}/g) ?? []).length, 2);
  assert.equal((source.match(/aria-label=\{isSaved \? labels\.captured : labels\.capture\}/g) ?? []).length, 2);
  assert.equal((source.match(/title=\{labels\.shadowing\}/g) ?? []).length, 2);
  assert.equal((source.match(/title=\{labels\.copy\}/g) ?? []).length, 2);
  assert.match(source, /hidden lg:inline text-xs[\s\S]*labels\.shadowing/);
  assert.match(source, /hidden lg:inline text-xs[\s\S]*labels\.copy/);
  assert.match(source, /hidden lg:inline text-xs[\s\S]*labels\.savedShort : labels\.captureShort/);
  assert.match(source, /role="button"[\s\S]*tabIndex=\{0\}[\s\S]*aria-label=\{labels\.selectSentence\}/);
  assert.match(source, /aria-hidden=\{isBlurred\}/);
  assert.match(source, /event\.target !== event\.currentTarget/);
  assert.match(source, /selectSentence: t\("selectSentence", \{ index: i \+ 1 \}\)/);
});
