import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const en = JSON.parse(readFileSync(new URL("../../../messages/en.json", import.meta.url), "utf8")) as {
  library?: { demoTrackTitle?: unknown };
};
const zh = JSON.parse(readFileSync(new URL("../../../messages/zh-CN.json", import.meta.url), "utf8")) as {
  library?: { demoTrackTitle?: unknown };
};

test("Library localizes the bundled Demo title without changing personal track titles", () => {
  assert.match(source, /track\.trackType === \"DEMO\"/);
  assert.match(source, /t\(\"demoTrackTitle\"\)/);
  assert.match(source, /displayTitle: t\(\"demoTrackTitle\"\)/);
  assert.match(source, /<LibraryManager tracks=\{displayTracks\}/);
  assert.equal(en.library?.demoTrackTitle, "Offline demo: blind listening");
  assert.equal(zh.library?.demoTrackTitle, "离线 Demo：盲听练习");
});
