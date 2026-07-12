import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("practice client delegates save-to-vault response parsing to the shared helper", () => {
  const source = readFileSync(new URL("./[id]/PracticeClient.tsx", import.meta.url), "utf8");

  assert.match(source, /@\/lib\/client-response/);
  assert.match(source, /requireOkResponse\(res,\s*"Failed to save to vault"\)/);
  assert.doesNotMatch(source, /if \(!res\.ok\) throw new Error\("Failed to save"\)/);
});

test("practice client keeps parsed save-to-vault server errors visible in the toast", () => {
  const source = readFileSync(new URL("./[id]/PracticeClient.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /catch \(error\) \{\s*toast\.error\(error instanceof Error \? error\.message : "Failed to save to vault"\);/,
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
