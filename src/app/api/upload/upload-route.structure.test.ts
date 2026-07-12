import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("single upload consumes the request stream without multipart buffering", () => {
  assert.match(source, /req\.headers\.get\("x-deeplistener-file-name"\)/);
  assert.match(source, /stream: req\.body/);
  assert.doesNotMatch(source, /export async function POST[\s\S]*?await req\.formData\(\)[\s\S]*?export async function PUT/);
});
