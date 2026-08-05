import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("provider settings deep link opens the real configuration dialog", async () => {
  const source = await readFile(new URL("./ProviderCardActions.tsx", import.meta.url), "utf8");

  assert.match(source, /window\.location\.hash === "#provider-settings"/);
  assert.match(source, /window\.addEventListener\("hashchange", openFromProviderHash\)/);
  assert.match(source, /setOpen\(true\)/);
  assert.match(source, /window\.history\.replaceState\(null, "", `\$\{window\.location\.pathname\}\$\{window\.location\.search\}`\)/);
});

test("provider settings restores focus to its stable entry button after close", async () => {
  const source = await readFile(new URL("./ProviderCardActions.tsx", import.meta.url), "utf8");

  assert.match(source, /useRef<HTMLButtonElement>\(null\)/);
  assert.match(source, /ref=\{configureButtonRef\}/);
  assert.match(source, /window\.requestAnimationFrame\(\(\) => configureButtonRef\.current\?\.focus\(\)\)/);
});
