import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ShadowingHeader.tsx", import.meta.url), "utf8");
const en = JSON.parse(readFileSync(new URL("../../../../messages/en.json", import.meta.url), "utf8")) as {
  feature: { shadowingConsole: Record<string, string> };
};
const zhCN = JSON.parse(readFileSync(new URL("../../../../messages/zh-CN.json", import.meta.url), "utf8")) as {
  feature: { shadowingConsole: Record<string, string> };
};

test("shadowing header gives icon-only actions localized accessible names", () => {
  assert.match(source, /aria-label=\{blindMode \? t\("showText"\) : t\("hideText"\)\}/);
  assert.match(source, /aria-label=\{isBookmarked \? t\("removeBookmark"\) : t\("bookmark"\)\}/);
  assert.match(source, /aria-label=\{commonT\("close"\)\}/);
  assert.doesNotMatch(source, /title=\{blindMode \? "Show text" : "Hide text"\}/);
  assert.notEqual(zhCN.feature.shadowingConsole.showText, en.feature.shadowingConsole.showText);
  assert.notEqual(zhCN.feature.shadowingConsole.bookmark, en.feature.shadowingConsole.bookmark);
});
