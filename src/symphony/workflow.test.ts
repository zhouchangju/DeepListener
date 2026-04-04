import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("workflow schema uses explicit key schemas for zod records", () => {
  const source = readFileSync(new URL("./workflow.ts", import.meta.url), "utf8");

  assert.match(source, /z\.record\(z\.string\(\), z\.any\(\)\)/);
  assert.doesNotMatch(source, /z\.record\(z\.any\(\)\)/);
});
