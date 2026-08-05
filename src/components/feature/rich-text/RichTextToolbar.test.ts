import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./RichTextToolbar.tsx", import.meta.url), "utf8");
type LocaleMessages = {
  feature: { richText: { colors: Record<string, string> } };
  library: { viewTracks: string };
  statuses: { shadowing: string; speedShadowing: string; paraphrase: string };
};

const en = JSON.parse(readFileSync(new URL("../../../../messages/en.json", import.meta.url), "utf8")) as LocaleMessages;
const zhCN = JSON.parse(readFileSync(new URL("../../../../messages/zh-CN.json", import.meta.url), "utf8")) as LocaleMessages;

test("default rich-text color controls expose translated labels", () => {
  assert.match(source, /labelKey: "black"/);
  assert.match(source, /labelKey: "purple"/);
  assert.match(source, /aria-label=\{resolvedColorLabel\}/);
  assert.match(source, /aria-label=\{t\("bold"\)\}/);
  assert.match(source, /aria-label=\{t\("copyText"\)\}/);
  assert.deepEqual(Object.keys(en.feature.richText.colors), ["black", "red", "blue", "green", "amber", "purple"]);
  assert.deepEqual(Object.keys(zhCN.feature.richText.colors), Object.keys(en.feature.richText.colors));
  assert.notEqual(zhCN.feature.richText.colors.black, en.feature.richText.colors.black);
});

test("Chinese library track switcher does not fall back to the English label", () => {
  assert.equal(zhCN.library.viewTracks, "素材");
  assert.notEqual(zhCN.library.viewTracks, en.library.viewTracks);
});

test("Chinese learning status labels stay learner-facing", () => {
  assert.deepEqual(
    {
      shadowing: zhCN.statuses.shadowing,
      speedShadowing: zhCN.statuses.speedShadowing,
      paraphrase: zhCN.statuses.paraphrase,
    },
    { shadowing: "跟读", speedShadowing: "倍速跟读", paraphrase: "复述" },
  );
});
