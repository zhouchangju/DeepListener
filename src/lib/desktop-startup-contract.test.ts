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
const preloadSource = readFileSync(
  new URL("../../desktop/preload.js", import.meta.url),
  "utf8",
);
const runtimeAssetsSource = readFileSync(
  new URL("../../desktop/runtime-assets.js", import.meta.url),
  "utf8",
);
const builderConfig = readFileSync(
  new URL("../../desktop/electron-builder.yml", import.meta.url),
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
  assert.match(instrumentationSource, /failedMigration \? ` \(migration: \$\{failedMigration\}\)`/);
  assert.match(instrumentationSource, /\[instrumentation\] Database initialization threw:/);
  assert.match(instrumentationSource, /redactDiagnosticText/);
  assert.match(
    instrumentationSource,
    /redactDiagnosticText\(\s*error instanceof Error \? error\.message : String\(error\),?\s*\)/,
  );
  assert.match(instrumentationSource, /terminateProcess\(1\);/);
  assert.doesNotMatch(instrumentationSource, /Database ready at \$\{dbFilePath\}/);
  assert.match(fatalStartupSource, /process\.exit\(code\)/);
  assert.doesNotMatch(
    instrumentationSource,
    /Migration failure[\s\S]{0,300}DO NOT crash/,
  );
});

test("desktop startup recovery is bounded and does not render raw failure details", () => {
  assert.match(mainSource, /function classifyStartupFailure\(reason\)/);
  assert.match(mainSource, /Recovery code: \$\{status\.code\}/);
  assert.doesNotMatch(mainSource, /<p>\$\{reason\}<\/p>/);
  assert.match(mainSource, /startup:retry/);
  assert.match(mainSource, /startup:open-diagnostics/);
  assert.match(preloadSource, /retryStartup: \(\) => ipcRenderer\.invoke\("startup:retry"\)/);
});

test("desktop diagnostics redact private paths and credentials before writing logs", () => {
  assert.match(mainSource, /const safe = redact\(msg\)/);
  assert.match(mainSource, /function redact\(s\)/);
  assert.match(mainSource, /api\[_-\]\?key/);
  assert.match(mainSource, /private-path/);
  assert.match(mainSource, /proc\.stderr\.on\("data", \(d\) => logError/);
  assert.doesNotMatch(mainSource, /log\(`data root: \$\{dataRoot\}`\)/);
});

test("desktop diagnostics persist through a bounded, rotating file logger", () => {
  assert.match(mainSource, /createBoundedLogWriter/);
  assert.match(mainSource, /fileName: "desktop\.log"/);
  assert.match(mainSource, /maxFiles: 3/);
  assert.match(mainSource, /getFileLogWriter\(\)\?\.write/);
});

test("desktop diagnostics export stays on a validated native save path", () => {
  assert.match(mainSource, /ipcMain\.handle\("diagnostics:save"/);
  assert.match(mainSource, /dialog\.showSaveDialog/);
  assert.match(mainSource, /filters: \[\{ name: "JSON", extensions: \["json"\] \}\]/);
  assert.match(mainSource, /validateDiagnosticsJson/);
  assert.match(mainSource, /isAppSender\(event\)/);
  assert.match(preloadSource, /saveDiagnostics: \(\) => ipcRenderer\.invoke\("diagnostics:save"\)/);
  assert.doesNotMatch(preloadSource, /require\(["']node:fs["']\)|require\(["']fs["']\)|readFile|writeFile/);
  assert.doesNotMatch(preloadSource, /contextBridge\.exposeInMainWorld[\s\S]{0,500}ipcRenderer\.(send|postMessage)/);
});

test("desktop packaging includes every main-process helper module", () => {
  assert.match(builderConfig, /- bounded-log\.js/);
  assert.match(builderConfig, /- native-export\.js/);
  assert.match(builderConfig, /- native-backup\.js/);
  assert.match(builderConfig, /- runtime-assets\.js/);
});

test("packaged Desktop media tools prefer verified assets and restrict system fallback to Alpha", () => {
  assert.match(mainSource, /resolvePackagedRuntimeAssets/);
  assert.match(mainSource, /resolveAlphaSystemRuntimeAssets/);
  assert.match(mainSource, /DEEPLISTENER_RUNTIME_ASSET_STATUS: "verified"/);
  assert.match(mainSource, /DEEPLISTENER_RUNTIME_ASSET_STATUS: "system"/);
  assert.match(mainSource, /DEEPLISTENER_RUNTIME_ASSET_STATUS: "missing"/);
  assert.match(mainSource, /__missing__.*ffmpeg/);
  assert.match(runtimeAssetsSource, /checksum mismatch: asset may be corrupt or tampered/);
  assert.match(runtimeAssetsSource, /manifestVersion !== 1/);
  assert.match(runtimeAssetsSource, /releaseChannel !== "internal-alpha"/);
});

test("desktop backup dialogs keep paths in the main process and use operation staging", () => {
  assert.match(mainSource, /ipcMain\.handle\("backup:export"/);
  assert.match(mainSource, /ipcMain\.handle\("backup:import"/);
  assert.match(mainSource, /showOpenDialog/);
  assert.match(mainSource, /\.deeplistener-backup-import-/);
  assert.match(mainSource, /stageBundle/);
  assert.match(mainSource, /exportBundle/);
  assert.match(preloadSource, /exportBackup: \(\) => ipcRenderer\.invoke\("backup:export"\)/);
  assert.match(preloadSource, /importBackup: \(\) => ipcRenderer\.invoke\("backup:import"\)/);
  assert.doesNotMatch(preloadSource, /filePaths|DEEPLISTENER_DATA_DIR|path\.join/);
});
