/**
 * DeepListener Desktop — Electron main process (W3 T170-T173).
 *
 * Production shell that hosts the packaged Next.js standalone service in a
 * sandboxed BrowserWindow. Security model and lifecycle are inherited from
 * the W0 feasibility spike (desktop-spike/) and hardened for production.
 *
 * RELEASE-BLOCKING security settings (NFR-010..014, do not weaken):
 *   - nodeIntegration: false
 *   - contextIsolation: true
 *   - sandbox: true
 *   - navigation/new-window denied unless allowlisted
 *   - per-launch authorization token, never persisted, never in renderer
 *
 * Process model (AD-002):
 *   Electron main → spawns standalone server.js on 127.0.0.1:randomPort
 *   BrowserWindow  → loads http://127.0.0.1:port (loopback only)
 *
 * Data root (AD-003): app.getPath("userData") becomes DEEPLISTENER_DATA_DIR.
 */
const {
  app,
  BrowserWindow,
  session,
  shell,
  ipcMain,
  Menu,
  dialog,
} = require("electron");
const { spawn } = require("node:child_process");
const { randomBytes, randomUUID } = require("node:crypto");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { createBoundedLogWriter } = require("./bounded-log.js");
const { validateDiagnosticsJson } = require("./native-export.js");
const {
  exportBundle,
  removeOwnedDirectory,
  stageBundle,
} = require("./native-backup.js");
const {
  resolveAlphaSystemRuntimeAssets,
  resolvePackagedRuntimeAssets,
} = require("./runtime-assets.js");

const HEADLESS = !!process.env.DEEPLISTENER_HEADLESS;
const HEALTH_TIMEOUT_MS = Number(process.env.DEEPLISTENER_HEALTH_TIMEOUT_MS || 30000);
const GRACEFUL_SHUTDOWN_MS = 5000;

// App icon: a PNG beside main.js works for BrowserWindow#icon in dev and
// packaged runs. Set it once so the Dock/taskbar shows the DeepListener brand
// instead of the default Electron icon, and so macOS stops showing a second
// generic dock tile alongside the app window.
const APP_ICON = (() => {
  const candidate = path.join(__dirname, "icon.png");
  return fs.existsSync(candidate) ? candidate : undefined;
})();

// Resolve the packaged standalone bundle. In production it sits beside the
// app resources; in dev it points at the project's .desktop-build/standalone.
function resolveStandaloneRoot() {
  const dev = process.env.DEEPLISTENER_STANDALONE_ROOT;
  if (dev && fs.existsSync(path.join(dev, "server.js"))) return dev;
  // Production: resources/standalone (Forge extraResource)
  const prod = path.join(process.resourcesPath || __dirname, "standalone");
  if (fs.existsSync(path.join(prod, "server.js"))) return prod;
  // Dev fallback
  const devBuild = path.resolve(__dirname, "..", ".desktop-build", "standalone");
  if (fs.existsSync(path.join(devBuild, "server.js"))) return devBuild;
  return null;
}

// --- per-launch authorization (DAS-003 / NFR-013) -----------------------
const LAUNCH_TOKEN = randomBytes(32).toString("hex");
const LAUNCH_ID = randomUUID();

let serviceProcess = null;
let servicePort = 0;
let mainWindow = null;
let healthTimer = null;
let shuttingDown = false;
let dataRoot = "";
let recoveryMode = false;
let fileLogWriter = null;
let launchHeaderInterceptorInstalled = false;

function getFileLogWriter() {
  if (fileLogWriter) return fileLogWriter;
  try {
    const root = dataRoot || resolveDataRoot();
    fileLogWriter = createBoundedLogWriter({
      directory: path.join(root, "logs"),
      fileName: "desktop.log",
      maxBytes: Number(process.env.DEEPLISTENER_LOG_MAX_BYTES || 512 * 1024),
      maxFiles: 3,
    });
  } catch {
    // app.getPath() can be unavailable before Electron is ready. The next
    // log call will retry; stdout/stderr remain the fallback meanwhile.
    fileLogWriter = null;
  }
  return fileLogWriter;
}

function log(msg) {
  // Bounded logging; never include tokens, secrets, or private filesystem
  // paths. The latter commonly appear in FFmpeg resolution and startup
  // errors, which are often shared as diagnostics by non-technical users.
  const safe = redact(msg);
  process.stdout.write(`[desktop] ${safe}\n`);
  getFileLogWriter()?.write(`[desktop] ${safe}\n`);
}
function logError(msg) {
  const safe = redact(msg);
  process.stderr.write(`[desktop] ${safe}\n`);
  getFileLogWriter()?.write(`[desktop] ${safe}\n`);
}

// ========================================================================
// data root (AD-003)
// ========================================================================
function resolveDataRoot() {
  // Prefer explicit override (dev/testing), else OS user-data dir.
  if (process.env.DEEPLISTENER_DATA_DIR) {
    return path.resolve(process.env.DEEPLISTENER_DATA_DIR);
  }
  return app.getPath("userData");
}
function ensureDataLayout(root) {
  for (const sub of [
    "database", "media/audio", "media/video", "media/temp",
    "exports", "backups", "logs", "settings", "runtime",
  ]) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }
}

// Keep only a bounded, categorical failure summary across restarts. The raw
// error remains in the redacted process log; this file is safe for the Setup
// diagnostics export to read and never contains a path, token, or user data.
function writeStartupFailureSummary(code, phase) {
  try {
    const root = dataRoot || resolveDataRoot();
    const directory = path.join(root, "runtime");
    fs.mkdirSync(directory, { recursive: true });
    const target = path.join(directory, "startup-failure.json");
    const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(
      temporary,
      `${JSON.stringify({ code: String(code).slice(0, 80), phase: String(phase).slice(0, 80), occurredAt: new Date().toISOString() })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    fs.renameSync(temporary, target);
  } catch {
    // Diagnostics must never make a startup failure worse.
  }
}

function clearStartupFailureSummary() {
  try {
    const root = dataRoot || resolveDataRoot();
    fs.rmSync(path.join(root, "runtime", "startup-failure.json"), { force: true });
  } catch {
    // Best effort only; stale summaries are still redacted and bounded.
  }
}

// ========================================================================
// dynamic free loopback port (DAS-003)
// ========================================================================
function pickFreeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

// ========================================================================
// first-run database initialization (DLR-001 / T140 migration runner)
// ========================================================================
// DB initialization is NOT done in the Electron main process anymore. The
// spawned Next.js standalone service runs it once at boot via its
// instrumentation hook (src/instrumentation.ts → register()), which calls the
// TS migration runner (src/lib/migration-runner.ts). That runner uses Node's
// built-in `node:sqlite` — no shell-out to system `sqlite3`, per-migration
// transactions with rollback, and a pre-migration backup gate (T142). This
// satisfies FR-001 (no system dependency) and FR-050 (data safety), and
// removes the duplicate first-run logic that used to live here.
//
// The main process only needs to (1) ensure the data-root directory layout
// exists (ensureDataLayout) and (2) pass the canonical DB file path to the
// service as DATABASE_URL. The canonical path follows the desktop layout
// (<dataRoot>/database/deeplistener.db), matching runtime-paths.ts.
function databaseFilePath(root) {
  return path.join(root, "database", "deeplistener.db");
}

// ========================================================================
// FFmpeg/ffprobe resolution (DFS-005)
// ========================================================================
// DeepListener uses fluent-ffmpeg for media import, video MP3 extraction, and
// audio export. fluent-ffmpeg resolves the binary via (1) FFMPEG_PATH env,
// A packaged Desktop app prefers the manifest/checksum pair. An explicitly
// marked internal Alpha may use a complete pair from fixed Homebrew roots;
// public/default packages never search the user's PATH. Explicit paths are set
// even on failure so fluent-ffmpeg cannot silently add another fallback.
function resolveFfmpegEnv() {
  const standaloneRoot = resolveStandaloneRoot();
  if (app.isPackaged) {
    const verified = standaloneRoot
      ? resolvePackagedRuntimeAssets({
          resourcesRoot: standaloneRoot,
          manifestPath: path.join(standaloneRoot, "runtime", "assets.manifest.json"),
          platform: process.platform,
          architecture: process.arch,
        })
      : { ok: false, reason: "standalone runtime is unavailable" };
    if (verified.ok) {
      log("verified packaged FFmpeg/ffprobe runtime assets");
      return {
        FFMPEG_PATH: verified.ffmpegPath,
        FFPROBE_PATH: verified.ffprobePath,
        DEEPLISTENER_RUNTIME_ASSET_STATUS: "verified",
      };
    }
    const system = standaloneRoot
      ? resolveAlphaSystemRuntimeAssets({
          resourcesRoot: standaloneRoot,
          platform: process.platform,
          architecture: process.arch,
        })
      : { ok: false, reason: "standalone runtime is unavailable" };
    if (system.ok) {
      log("internal Alpha system FFmpeg/ffprobe resolved from an approved location");
      return {
        FFMPEG_PATH: system.ffmpegPath,
        FFPROBE_PATH: system.ffprobePath,
        DEEPLISTENER_RUNTIME_ASSET_STATUS: "system",
      };
    }
    const missingRoot = standaloneRoot || path.join(process.resourcesPath || __dirname, "standalone");
    logError(`packaged FFmpeg/ffprobe rejected: ${verified.reason}; ${system.reason}`);
    return {
      // Explicit non-existent paths prevent fluent-ffmpeg from searching PATH.
      FFMPEG_PATH: path.join(missingRoot, "runtime", "__missing__", "ffmpeg"),
      FFPROBE_PATH: path.join(missingRoot, "runtime", "__missing__", "ffprobe"),
      DEEPLISTENER_RUNTIME_ASSET_STATUS: "missing",
    };
  }

  const candidates = [
    process.env.FFMPEG_PATH,
    process.resourcesPath && path.join(process.resourcesPath, "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
    path.join(__dirname, "vendor", "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
  ].filter(Boolean);
  const probeCandidates = [
    process.env.FFPROBE_PATH,
    process.resourcesPath && path.join(process.resourcesPath, "ffmpeg", process.platform === "win32" ? "ffprobe.exe" : "ffprobe"),
    path.join(__dirname, "vendor", "ffmpeg", process.platform === "win32" ? "ffprobe.exe" : "ffprobe"),
  ].filter(Boolean);

  const env = { DEEPLISTENER_RUNTIME_ASSET_STATUS: "development" };
  const ffmpeg = candidates.find((p) => fs.existsSync(p));
  if (ffmpeg) {
    env.FFMPEG_PATH = ffmpeg;
    log(`ffmpeg resolved: ${ffmpeg}`);
  }
  const ffprobe = probeCandidates.find((p) => fs.existsSync(p));
  if (ffprobe) {
    env.FFPROBE_PATH = ffprobe;
    log(`ffprobe resolved: ${ffprobe}`);
  }
  // Development-only warning. A packaged build takes the fail-closed branch
  // above and never relies on PATH.
  if (!ffmpeg && !ffprobe) {
    logError(
      "FFmpeg/ffprobe are unavailable in development; media import/export will use the system PATH if present.",
    );
  } else if (!ffmpeg) {
    logError("ffmpeg binary is unavailable in development; media import/export may fail without a system FFmpeg.");
  } else if (!ffprobe) {
    logError("ffprobe binary is unavailable in development; media probing may fail without a system ffprobe.");
  }
  return env;
}

// ========================================================================
// service lifecycle (DAS-005)
// ========================================================================
function startService(port, root, dbFile) {
  const standaloneRoot = resolveStandaloneRoot();
  if (!standaloneRoot) throw new Error("standalone bundle not found.");
  const ffmpegEnv = resolveFfmpegEnv();
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ["server.js"], {
      cwd: standaloneRoot,
      env: {
        ...process.env,
        ...ffmpegEnv,
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
        // In a packaged app, process.execPath is the Electron binary, not node.
        // ELECTRON_RUN_AS_NODE makes the same binary behave as a plain Node.js
        // runtime so it can require() and run server.js directly. Without this,
        // the spawn would launch a second Electron window instead of the service.
        ELECTRON_RUN_AS_NODE: "1",
        // Explicit absolute data root + DB (decouples from cwd — T110/T111).
        DEEPLISTENER_DATA_DIR: root,
        // macOS desktop credentials live in the user Keychain; the standalone
        // server keeps the file backend for legacy/server/test layouts.
        DEEPLISTENER_SECRET_BACKEND: process.platform === "darwin" ? "keychain" : "file",
        DATABASE_URL: `file:${dbFile}`,
        // The standalone package copies the frozen Prisma migrations here.
        // Pass the path explicitly instead of relying on compiled module
        // locations, which are not stable after Next.js bundles instrumentation.
        DEEPLISTENER_MIGRATIONS_DIR: path.join(standaloneRoot, "prisma", "migrations"),
        // per-launch token injected via env; the service middleware (W3 T173)
        // will validate it for privileged endpoints. Renderer never sees it.
        DEEPLISTENER_REQUIRE_LAUNCH_TOKEN: "1",
        DEEPLISTENER_LAUNCH_TOKEN: LAUNCH_TOKEN,
        DEEPLISTENER_LAUNCH_ID: LAUNCH_ID,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let boot = "";
    proc.stdout.on("data", (d) => {
      boot += d.toString();
      if (boot.includes("Ready")) resolve(proc);
    });
    proc.stderr.on("data", (d) => logError(`[service] ${d.toString()}`));
    proc.on("exit", (code, signal) => {
      if (!shuttingDown && !mainWindow) {
        logError(`service exited early code=${code} signal=${signal}`);
      }
    });
    setTimeout(() => {
      if (!proc.killed) resolve(proc);
    }, 4000);
  });
}

// bounded health wait (DAS-004)
function waitForHealth(port) {
  const http = require("node:http");
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function poll() {
      const req = http.get(
        {
          host: "127.0.0.1",
          port,
          path: "/api/symphony/state",
          timeout: 2000,
          headers: launchAuthHeaders(),
        },
        (res) => {
          if (res.statusCode === 200) return resolve(true);
          res.resume();
          retry();
        },
      );
      req.on("error", retry);
      req.on("timeout", () => { req.destroy(); retry(); });
    }
    function retry() {
      if (Date.now() - start > HEALTH_TIMEOUT_MS) {
        return reject(new Error(`service health timeout after ${HEALTH_TIMEOUT_MS}ms`));
      }
      healthTimer = setTimeout(poll, 300);
    }
    poll();
  });
}

// ========================================================================
// sandboxed BrowserWindow (DAS-006 / NFR-010..014) — RELEASE-BLOCKING
// ========================================================================
function createWindow(origin) {
  // CSP on the session (NFR-014).
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        ],
        "X-Content-Type-Options": ["nosniff"],
        "X-Frame-Options": ["DENY"],
        "Referrer-Policy": ["no-referrer"],
      },
    });
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: !HEADLESS,
    title: "DeepListener",
    backgroundColor: "#0a0a0a",
    icon: APP_ICON,
    webPreferences: {
      // RELEASE-BLOCKING security triad (NFR-010).
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // NFR-011 — deny unapproved navigation & new-window creation.
  // TEMP DIAG: surface renderer console + load failures to stdout for debugging.
  mainWindow.webContents.on("console-message", (e, level, message, line, sourceId) => {
    log(`[renderer] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on("did-fail-load", (e, code, desc, url) => {
    logError(`did-fail-load ${code} ${desc} ${redact(url || "")}`);
  });
  mainWindow.webContents.on("render-process-gone", (e, details) => {
    logError(`render-process-gone ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (!isSelfOrigin(url)) {
      e.preventDefault();
      log(`blocked navigation to ${redact(url)}`);
    }
  });
  mainWindow.webContents.on("will-redirect", (e, url) => {
    if (!isSelfOrigin(url)) {
      e.preventDefault();
      log(`blocked redirect to ${redact(url)}`);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowlistedExternal(url)) {
      shell.openExternal(url);
    } else {
      log(`blocked window-open to ${redact(url)}`);
      // Surface the deny to the renderer so it can show a toast. The renderer
      // opts in via preload's onExternalBlocked (see desktop/preload.js).
      // Wiring the actual toast component is a renderer-side follow-up; the
      // IPC channel is stable either way.
      try {
        mainWindow.webContents.send("external-blocked", { url: redact(url) });
      } catch { /* window may be gone */ }
    }
    return { action: "deny" };
  });

  // NFR-012 — deny permissions the renderer does not need.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(new Set(["clipboard-read", "clipboard-sanitized-write"]).has(permission));
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  // The renderer cannot read LAUNCH_TOKEN. Electron adds it only to requests
  // addressed to this process's own loopback origin, keeping static assets,
  // page data, and API calls inside the same authorization boundary.
  if (!launchHeaderInterceptorInstalled) {
    const originUrl = new URL(origin);
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: [`${originUrl.protocol}//${originUrl.host}/*`] },
      (details, callback) => {
        if (isSelfOrigin(details.url)) {
          details.requestHeaders["X-DeepListener-Launch-Token"] = LAUNCH_TOKEN;
        }
        callback({ requestHeaders: details.requestHeaders });
      },
    );
    launchHeaderInterceptorInstalled = true;
  }

  const windowRef = mainWindow;
  mainWindow.loadURL(origin);
  mainWindow.on("closed", () => {
    if (mainWindow === windowRef) mainWindow = null;
  });
}

function isSelfOrigin(url) {
  try {
    const u = new URL(url);
    return u.hostname === "127.0.0.1" && u.port === String(servicePort);
  } catch { return false; }
}
function isAllowlistedExternal(url) {
  try {
    const u = new URL(url);
    // https-only. google.com covers aistudio.google.com (Google AI Studio
    // "open console"), console.cloud.google.com, accounts.google.com, etc.
    return u.protocol === "https:" && /^([a-z0-9-]+\.)?(github\.com|deepgram\.com|openai\.com|google\.com)$/.test(u.hostname);
  } catch { return false; }
}
function redact(s) {
  return String(s)
    .replace(/token=[^&\s]+/gi, "token=REDACTED")
    .replace(/((?:api[_-]?key|secret|password|authorization|credential)[=:]\s*)[^\s,}]+/gi, "$1REDACTED")
    .replace(/(?:file:\/\/\/)?[A-Za-z]:[\\/][^\r\n,)]+|\/(?:Users|home|private|var|tmp)\/[^\r\n,)]+/g, "<private-path>");
}
function launchAuthHeaders() {
  return { "X-DeepListener-Launch-Token": LAUNCH_TOKEN };
}

function classifyStartupFailure(reason) {
  const text = String(reason).toLowerCase();
  if (text.includes("database") || text.includes("migration") || text.includes("sqlite")) {
    return {
      code: "DATABASE_UNAVAILABLE",
      title: "Your local learning data is unavailable",
      body: "DeepListener could not prepare its local learning database. Your existing media and learning history were not removed. Open Setup after restarting to review the read-only checks.",
    };
  }
  if (text.includes("standalone") || text.includes("bundle")) {
    return {
      code: "APP_ASSET_MISSING",
      title: "DeepListener is missing an application file",
      body: "This installation is incomplete or damaged. Restart once, then reinstall the application if the problem continues.",
    };
  }
  if (text.includes("health") || text.includes("timeout") || text.includes("127.0.0.1")) {
    return {
      code: "LOCAL_SERVICE_UNAVAILABLE",
      title: "The local DeepListener service did not respond",
      body: "The app could not finish starting its private local service. Restart once; if it continues, open diagnostics and share the redacted log with the maintainer.",
    };
  }
  return {
    code: "STARTUP_UNAVAILABLE",
    title: "DeepListener could not start",
    body: "The app could not finish starting. Your local data was not removed. Restart once, then open diagnostics if the problem continues.",
  };
}

function isRecoverySender(event) {
  return Boolean(recoveryMode && mainWindow && event.sender === mainWindow.webContents);
}

function isAppSender(event) {
  return Boolean(
    !recoveryMode &&
    mainWindow &&
    event.sender === mainWindow.webContents &&
    event.senderFrame &&
    isSelfOrigin(event.senderFrame.url),
  );
}

async function fetchDiagnosticsForExport() {
  if (!servicePort) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`http://127.0.0.1:${servicePort}/api/diagnostics`, {
      cache: "no-store",
      headers: launchAuthHeaders(),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, code: "DIAGNOSTICS_UNAVAILABLE" };
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 2 * 1024 * 1024) return { ok: false, code: "PAYLOAD_TOO_LARGE" };
    return validateDiagnosticsJson(await response.text());
  } catch {
    return { ok: false, code: "DIAGNOSTICS_UNAVAILABLE" };
  } finally {
    clearTimeout(timeout);
  }
}

async function postLocalJson(pathname, body) {
  if (!servicePort) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`http://127.0.0.1:${servicePort}${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...launchAuthHeaders() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, payload };
  } catch {
    return { ok: false, code: "LOCAL_SERVICE_UNAVAILABLE" };
  } finally {
    clearTimeout(timeout);
  }
}

// ========================================================================
// validated IPC (NFR-012) — narrow, sender-checked
// ========================================================================
ipcMain.handle("app:ping", (event) => {
  if (mainWindow && event.senderFrame && event.senderFrame.url !== mainWindow.webContents.getURL()) {
    log("ipc ping from unexpected sender");
    return { ok: false };
  }
  return { ok: true, launchId: LAUNCH_ID }; // NEVER return the token
});
ipcMain.handle("app:version", () => {
  try {
    const pkg = require("./package.json");
    return { version: pkg.version };
  } catch { return { version: "0.0.0" }; }
});
ipcMain.handle("startup:retry", (event) => {
  if (!isRecoverySender(event)) return { ok: false };
  app.relaunch();
  app.exit(0);
  return { ok: true };
});
ipcMain.handle("startup:open-diagnostics", (event) => {
  if (!isRecoverySender(event)) return { ok: false };
  void shell.openPath(path.join(dataRoot || app.getPath("userData"), "logs"));
  return { ok: true };
});
ipcMain.handle("diagnostics:save", async (event) => {
  if (!isAppSender(event) || !mainWindow) return { ok: false, code: "UNAUTHORIZED" };
  const payload = await fetchDiagnosticsForExport();
  if (!payload.ok) return payload;
  const defaultRoot = dataRoot || app.getPath("userData");
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save DeepListener diagnostics",
    defaultPath: path.join(defaultRoot, "exports", "deeplistener-diagnostics.json"),
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["showOverwriteConfirmation", "createDirectory"],
  });
  if (result.canceled || !result.filePath) return { ok: true, canceled: true };
  try {
    fs.mkdirSync(path.dirname(result.filePath), { recursive: true });
    fs.writeFileSync(result.filePath, payload.content, { encoding: "utf8", mode: 0o600 });
    return { ok: true, canceled: false };
  } catch {
    return { ok: false, code: "WRITE_FAILED" };
  }
});
ipcMain.handle("backup:export", async (event) => {
  if (!isAppSender(event) || !mainWindow) return { ok: false, code: "UNAUTHORIZED" };
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "Choose a folder for your DeepListener backup",
    properties: ["openDirectory", "createDirectory"],
  });
  if (selection.canceled || !selection.filePaths[0]) return { ok: true, canceled: true };
  const created = await postLocalJson("/api/backups", { action: "create" });
  const backupId = created.ok && created.payload?.backup?.id;
  if (typeof backupId !== "string") return { ok: false, code: "BACKUP_UNAVAILABLE" };
  const sourcePath = path.join(dataRoot || app.getPath("userData"), "backups", backupId);
  const copied = await exportBundle(sourcePath, selection.filePaths[0], backupId);
  return copied.ok ? { ok: true, canceled: false } : { ok: false, code: copied.code };
});
ipcMain.handle("backup:import", async (event) => {
  if (!isAppSender(event) || !mainWindow) return { ok: false, code: "UNAUTHORIZED" };
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "Select a DeepListener backup folder",
    properties: ["openDirectory"],
  });
  if (selection.canceled || !selection.filePaths[0]) return { ok: true, canceled: true };
  const root = dataRoot || app.getPath("userData");
  const stagingId = `.deeplistener-backup-import-${randomUUID()}`;
  const stagingPath = path.join(root, "backups", stagingId);
  const staged = await stageBundle(selection.filePaths[0], stagingPath);
  if (!staged.ok) return { ok: false, code: staged.code };
  const imported = await postLocalJson("/api/backups", { action: "import", stagingId });
  if (imported.ok && imported.payload?.imported === true) return { ok: true, canceled: false };
  if (await removeOwnedDirectory(stagingPath)) {
    return { ok: false, code: "IMPORT_UNAVAILABLE" };
  }
  return { ok: false, code: "IMPORT_UNAVAILABLE" };
});

// ========================================================================
// recovery surface (DAS-004)
// ========================================================================
function showRecovery(reason) {
  if (mainWindow) mainWindow.destroy();
  recoveryMode = true;
  const status = classifyStartupFailure(reason);
  writeStartupFailureSummary(status.code, "desktop-startup");
  mainWindow = new BrowserWindow({
    width: 640,
    height: 460,
    show: !HEADLESS,
    title: "DeepListener",
    icon: APP_ICON,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  const recoveryWindow = mainWindow;
  mainWindow.on("closed", () => {
    if (mainWindow === recoveryWindow) {
      mainWindow = null;
      recoveryMode = false;
    }
  });
  mainWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(
      `<meta charset="utf-8"><title>DeepListener</title>` +
      `<body style="font-family:-apple-system,sans-serif;padding:2em;color:#222;background:#fafafa">` +
      `<h1>${status.title}</h1><p>${status.body}</p>` +
      `<p style="font-size:.9em;color:#666">Recovery code: ${status.code}</p>` +
      `<p><button id="retry" type="button">Restart DeepListener</button> ` +
      `<button id="diagnostics" type="button">Open diagnostics</button></p>` +
      `<script>` +
      `document.getElementById('retry').onclick=()=>window.deepListener?.retryStartup?.();` +
      `document.getElementById('diagnostics').onclick=()=>window.deepListener?.openDiagnostics?.();` +
      `</script></body>`,
    ),
  );
  logError(`recovery shown: ${status.code}`);
}

// ========================================================================
// graceful shutdown (DAS-005)
// ========================================================================
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (healthTimer) clearTimeout(healthTimer);
  if (serviceProcess && !serviceProcess.killed) {
    try {
      serviceProcess.kill("SIGTERM");
      setTimeout(() => {
        try {
          if (serviceProcess && !serviceProcess.killed) serviceProcess.kill("SIGKILL");
        } catch { /* gone */ }
        app.quit();
      }, GRACEFUL_SHUTDOWN_MS);
    } catch { app.quit(); }
  } else { app.quit(); }
}

// ========================================================================
// application menu (DAS-007) — minimal role-based menu
// ========================================================================
// Menu.setApplicationMenu(null) removes the standard role-based accelerators on
// macOS (Cmd+Q, Cmd+W, Cmd+C, Cmd+R, Zoom...). Instead install a minimal menu
// built from role menus, which restores those standard shortcuts without adding
// any custom entries that could confuse the sandboxed renderer. Headless test
// mode stays menu-less so background runs don't perturb the host.
function buildApplicationMenu() {
  if (HEADLESS) return;
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: "appMenu" },   // About / Hide / Quit (Cmd+Q)
      { role: "editMenu" },  // Undo/Redo/Cut/Copy/Paste/Select All
      { role: "viewMenu" },  // Reload/Force Reload/DevTools/Zoom/Fullscreen
      { role: "windowMenu" }, // Minimize/Zoom/Close (Cmd+W)
    ]));
    return;
  }
  // Non-darwin: a lean template. viewMenu/editMenu give Zoom + Reload + editing
  // roles; a File menu carries the Quit accelerator (Ctrl+Q) via the quit role.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      role: "fileMenu",
      submenu: [{ role: "quit" }],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]));
}

// ========================================================================
// single instance (DAS-002) + boot
// ========================================================================
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log("second instance; quitting");
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    log("second launch focused existing window");
  });

  app.whenReady().then(async () => {
    buildApplicationMenu();
    // Unify the macOS Dock to a single brand tile. In unpackaged dev runs
    // (`electron .`) macOS otherwise shows the default Electron icon and, with
    // multiple renderer/helper processes, can surface a second generic tile.
    // Setting the Dock icon early collapses them into one DeepListener tile.
    if (process.platform === "darwin" && APP_ICON && app.dock) {
      try { app.dock.setIcon(APP_ICON); } catch { /* non-fatal: dock unavailable */ }
    }
    try {
      dataRoot = resolveDataRoot();
      ensureDataLayout(dataRoot);
      log("data root resolved");
      log(`launch id: ${LAUNCH_ID} (token redacted)`);

      // DB initialization now happens inside the spawned service (via its
      // instrumentation hook → TS migration runner). The main process only
      // derives the canonical DB file path to hand it to the service as
      // DATABASE_URL so the service and Prisma agree on the file.
      const dbFile = databaseFilePath(dataRoot);
      servicePort = await pickFreeLoopbackPort();
      serviceProcess = await startService(servicePort, dataRoot, dbFile);
      await waitForHealth(servicePort);
      log(`service healthy on 127.0.0.1:${servicePort}`);
      clearStartupFailureSummary();
      createWindow(`http://127.0.0.1:${servicePort}`);
      if (HEADLESS) setTimeout(() => shutdown(), 1500);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err || "");
      const status = classifyStartupFailure(reason);
      logError(`startup failed: ${status.code}`);
      showRecovery(reason);
      if (HEADLESS) setTimeout(() => shutdown(), 2000);
    }
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") shutdown(); });
  app.on("before-quit", shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
