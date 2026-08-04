import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainSource = readFileSync(
  new URL("../../desktop/main.js", import.meta.url),
  "utf8",
);
const instrumentationSource = readFileSync(
  new URL("../instrumentation.ts", import.meta.url),
  "utf8",
);
const fatalStartupSource = readFileSync(
  new URL("./fatal-startup.ts", import.meta.url),
  "utf8",
);

test("desktop passes the packaged Prisma migration directory to the standalone service", () => {
  assert.match(
    mainSource,
    /DEEPLISTENER_MIGRATIONS_DIR:\s*path\.join\(standaloneRoot, "prisma", "migrations"\)/,
  );
  assert.match(
    mainSource,
    /DEEPLISTENER_SECRET_BACKEND:\s*process\.platform === "darwin" \? "keychain" : "file"/,
  );
});

test("desktop database initialization fails closed", () => {
  assert.match(instrumentationSource, /throw new Error\(\s*`Database initialization failed/);
  assert.match(
    instrumentationSource,
    /console\.error\("\[instrumentation\] Database initialization threw:", error\);[\s\S]{0,400}terminateProcess\(1\);/,
  );
  assert.match(fatalStartupSource, /process\.exit\(code\)/);
  assert.doesNotMatch(
    instrumentationSource,
    /Migration failure[\s\S]{0,300}DO NOT crash/,
  );
});
