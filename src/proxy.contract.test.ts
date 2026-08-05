import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const originalRequire = process.env.DEEPLISTENER_REQUIRE_LAUNCH_TOKEN;
const originalToken = process.env.DEEPLISTENER_LAUNCH_TOKEN;

function restoreEnv() {
  if (originalRequire === undefined) delete process.env.DEEPLISTENER_REQUIRE_LAUNCH_TOKEN;
  else process.env.DEEPLISTENER_REQUIRE_LAUNCH_TOKEN = originalRequire;
  if (originalToken === undefined) delete process.env.DEEPLISTENER_LAUNCH_TOKEN;
  else process.env.DEEPLISTENER_LAUNCH_TOKEN = originalToken;
}

test.after(() => restoreEnv());

test("Desktop proxy rejects missing and incorrect launch tokens without a body", async () => {
  process.env.DEEPLISTENER_REQUIRE_LAUNCH_TOKEN = "1";
  process.env.DEEPLISTENER_LAUNCH_TOKEN = "launch-secret";

  const missing = proxy(new NextRequest("http://127.0.0.1:43123/api/setup/provider"));
  assert.equal(missing.status, 401);
  assert.equal(missing.headers.get("cache-control"), "no-store");
  assert.equal(await missing.text(), "");

  const wrong = proxy(new NextRequest("http://127.0.0.1:43123/api/setup/provider", {
    headers: { "x-deeplistener-launch-token": "wrong" },
  }));
  assert.equal(wrong.status, 401);
});

test("Desktop proxy allows the exact token and remains pass-through when disabled", () => {
  process.env.DEEPLISTENER_REQUIRE_LAUNCH_TOKEN = "1";
  process.env.DEEPLISTENER_LAUNCH_TOKEN = "launch-secret";
  const allowed = proxy(new NextRequest("http://127.0.0.1:43123/_next/static/app.js", {
    headers: { "x-deeplistener-launch-token": "launch-secret" },
  }));
  assert.equal(allowed.status, 200);

  delete process.env.DEEPLISTENER_REQUIRE_LAUNCH_TOKEN;
  const passThrough = proxy(new NextRequest("http://127.0.0.1:43123/api/diagnostics"));
  assert.equal(passThrough.status, 200);
});
