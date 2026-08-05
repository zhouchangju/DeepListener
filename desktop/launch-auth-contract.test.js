const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const mainSource = readFileSync(require.resolve("./main.js"), "utf8");
const preloadSource = readFileSync(require.resolve("./preload.js"), "utf8");
const proxySource = readFileSync(require.resolve("../src/proxy.ts"), "utf8");

test("Desktop explicitly enables per-launch authorization and injects only to its own origin", () => {
  assert.match(mainSource, /DEEPLISTENER_REQUIRE_LAUNCH_TOKEN:\s*"1"/);
  assert.match(mainSource, /webRequest\.onBeforeSendHeaders/);
  assert.match(mainSource, /X-DeepListener-Launch-Token/);
  assert.match(mainSource, /\$\{originUrl\.protocol\}\/\/\$\{originUrl\.host\}\/\*/);
  assert.match(mainSource, /if \(isSelfOrigin\(details\.url\)\)/);
});

test("Desktop internal requests and health probes carry the launch token", () => {
  assert.match(mainSource, /path: "\/api\/symphony\/state"[\s\S]{0,180}headers: launchAuthHeaders\(\)/);
  assert.match(mainSource, /fetch\(`http:\/\/127\.0\.0\.1:\$\{servicePort\}\/api\/diagnostics`[\s\S]{0,180}headers: launchAuthHeaders\(\)/);
  assert.match(mainSource, /headers: \{ "content-type": "application\/json", \.\.\.launchAuthHeaders\(\) \}/);
});

test("The launch token never enters the preload bridge", () => {
  assert.doesNotMatch(preloadSource, /LAUNCH_TOKEN|DEEPLISTENER_LAUNCH_TOKEN|DeepListener-Launch-Token/);
});

test("Proxy protects every route only when Desktop opts in and returns a body-less 401", () => {
  assert.match(proxySource, /desktopLaunchAuthEnabled\(\)/);
  assert.match(proxySource, /matcher:\s*\["\/:path\*"\]/);
  assert.match(proxySource, /new NextResponse\(null,\s*\{\s*status: 401/);
});
