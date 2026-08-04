import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("practice client delegates save-to-vault response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./[id]/PracticeClient.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*t\("saveVaultFailed"\)\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed to save"\)/);
});

test("practice client keeps parsed save-to-vault server errors visible in the toast", () => {
  const source = readFileSync(new URL("./[id]/PracticeClient.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /catch \(error\) \{\s*toast\.error\(error instanceof Error \? error\.message : t\("saveVaultFailed"\)\);/,
  );
});

test("practice passes optional video through while keeping audio for downstream listening tools", () => {
  const source = readFileSync(new URL("./[id]/PracticeClient.tsx", import.meta.url), "utf8");

  assert.match(source, /videoUrl\?: string \| null/);
  assert.match(source, /audioUrl=\{track\.audioUrl\}/);
  assert.match(source, /videoUrl=\{track\.videoUrl\}/);
  assert.match(source, /fetchAndDecodeAudio\(track\.audioUrl\)/);
  assert.doesNotMatch(source, /CourseNote|course note|课程笔记/i);
});

test("practice exposes the first-session blind-mode and Capture handoff contracts", () => {
  const source = readFileSync(new URL("./[id]/PracticeClient.tsx", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");

  assert.match(source, /initialBlindMode\?: boolean/);
  assert.match(source, /useState\(initialBlindMode\)/);
  assert.match(pageSource, /searchParams\?: Promise<\{ demo\?: string \}>/);
  assert.match(pageSource, /initialBlindMode=\{query\?\.demo === "1"\}/);
  assert.match(source, /href=\{`\/vault\?trackId=\$\{track\.id\}`\}/);
  assert.match(source, /href="\/review"/);
  assert.match(source, /captureHandoffVisible/);
});

test("practice uses a height-safe desktop workspace instead of stacking notes under the player", () => {
  const source = readFileSync(new URL("./[id]/PracticeClient.tsx", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");
  const playerSource = readFileSync(
    new URL("../../components/feature/AudioPlayer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /md:grid-cols-\[minmax\(0,2fr\)_minmax\(280px,1fr\)\]/);
  assert.match(source, /min-h-\[480px\]/);
  assert.match(source, /href=\{`\/vault\?trackId=\$\{track\.id\}`\}/);
  assert.doesNotMatch(pageSource, /<h1/);
  assert.match(playerSource, /h-full min-h-0/);
});
