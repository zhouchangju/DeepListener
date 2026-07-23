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
const { spawn, execFile, execFileSync } = require("node:child_process");
const { randomBytes, randomUUID } = require("node:crypto");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

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

function log(msg) {
  // Bounded logging; never include tokens or secrets.
  const safe = String(msg).replace(/token=[^\s]+/gi, "token=REDACTED");
  process.stdout.write(`[desktop] ${safe}\n`);
}
function logError(msg) {
  const safe = String(msg).replace(/token=[^\s]+/gi, "token=REDACTED");
  process.stderr.write(`[desktop] ${safe}\n`);
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
function ensureDatabaseReady(root) {
  return new Promise((resolve, reject) => {
    const dbFile = path.join(root, "database", "deeplistener.db");
    const migrationsDir = findMigrationsDir();
    if (!migrationsDir) {
      return reject(new Error("prisma/migrations not found beside the app bundle."));
    }
    // Apply migration SQL offline via the bundled sqlite3 (or system fallback).
    // This mirrors the offline migration runner (T140) behavior. For production
    // the migration runner module (src/lib/migration-runner.ts) is the source
    // of truth; here we shell out as the bootstrap before the Node service can
    // import it. A pre-migration backup (T142) is created if the DB exists.
    const backupDir = path.join(root, "backups");
    fs.mkdirSync(backupDir, { recursive: true });

    // Idempotent check: if the DB already has tables, skip migration. This
    // avoids "table already exists" errors on restart.
    function dbHasTables() {
      try {
        const out = execFileSync("sqlite3", [dbFile, "SELECT count(*) FROM sqlite_master WHERE type='table';"], {
          stdio: ["ignore", "pipe", "pipe"], timeout: 3000, encoding: "utf8",
        });
        const count = parseInt(out.trim(), 10);
        return Number.isFinite(count) && count > 0;
      } catch { return false; }
    }
    if (fs.existsSync(dbFile) && dbHasTables()) {
      log(`database already initialized: ${path.relative(root, dbFile)}`);
      return resolve(dbFile);
    }

    function applyMigrations() {
      // Concatenate migration SQL in order and write to a temp file, then
      // pipe it to sqlite3. execFile input is unreliable in Electron's runtime.
      const dirs = fs.readdirSync(migrationsDir)
        .filter((d) => !d.endsWith(".toml") && !d.startsWith("."))
        .sort();
      let combined = ".echo off\n";
      for (const d of dirs) {
        const p = path.join(migrationsDir, d, "migration.sql");
        if (fs.existsSync(p)) combined += fs.readFileSync(p, "utf8") + "\n";
      }
      const tmpSql = path.join(root, "runtime", `migrations-${Date.now()}.sql`);
      fs.mkdirSync(path.dirname(tmpSql), { recursive: true });
      fs.writeFileSync(tmpSql, combined);

      const child = execFile("sqlite3", ["-batch", dbFile], {
        stdio: ["pipe", "pipe", "pipe"],
      }, (err) => {
        if (err) return reject(new Error(`database initialization failed: ${err.message}`));
        log(`database ready: ${path.relative(root, dbFile)}`);
        try { fs.unlinkSync(tmpSql); } catch { /* best-effort */ }
        resolve(dbFile);
      });
      // Pipe the SQL file to sqlite3 stdin via an fs read stream.
      const stdin = fs.createReadStream(tmpSql);
      stdin.pipe(child.stdin);
    }

    if (fs.existsSync(dbFile)) {
      // pre-migration backup (T142)
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backup = path.join(backupDir, `pre-migration-${ts}.db`);
      fs.copyFileSync(dbFile, backup);
      log(`pre-migration backup created: ${path.relative(root, backup)}`);
    }
    applyMigrations();
  });
}
function findMigrationsDir() {
  const candidates = [
    process.env.DEEPLISTENER_MIGRATIONS_DIR,
    path.join(process.resourcesPath || __dirname, "standalone", "prisma", "migrations"),
    path.resolve(__dirname, "..", "prisma", "migrations"),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// ========================================================================
// FFmpeg/ffprobe resolution (DFS-005)
// ========================================================================
// DeepListener uses fluent-ffmpeg for media import, video MP3 extraction, and
// audio export. fluent-ffmpeg resolves the binary via (1) FFMPEG_PATH env,
// (2) system PATH lookup. Desktop resolves a usable binary in this priority:
//   1. explicit FFMPEG_PATH / FFPROBE_PATH env (dev/test override);
//   2. vendored binaries at <resourcesPath>/ffmpeg/{ffmpeg,ffprobe} or
//      <__dirname>/vendor/ffmpeg/{ffmpeg,ffprobe} (dev fallback);
//   3. system PATH (do nothing — fluent-ffmpeg's default).
// We only set the env when we found a concrete file, so a system install keeps
// working unchanged. This keeps the bundle small for technical users who have
// FFmpeg installed, while still supporting a vendored fallback for packaging.
function resolveFfmpegEnv() {
  const candidates = [
    process.env.FFMPEG_PATH,
    process.resourcesPath && path.join(process.resourcesPath, "ffmpeg", "ffmpeg"),
    path.join(__dirname, "vendor", "ffmpeg", "ffmpeg"),
  ].filter(Boolean);
  const probeCandidates = [
    process.env.FFPROBE_PATH,
    process.resourcesPath && path.join(process.resourcesPath, "ffmpeg", "ffprobe"),
    path.join(__dirname, "vendor", "ffmpeg", "ffprobe"),
  ].filter(Boolean);

  const env = {};
  const ffmpeg = candidates.find((p) => fs.existsSync(p));
  if (ffmpeg) {
    env.FFMPEG_PATH = ffmpeg;
    log(`ffmpeg resolved: ${ffmpeg}`);
  } else {
    log("ffmpeg not vendored; relying on system PATH");
  }
  const ffprobe = probeCandidates.find((p) => fs.existsSync(p));
  if (ffprobe) {
    env.FFPROBE_PATH = ffprobe;
    log(`ffprobe resolved: ${ffprobe}`);
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
        DATABASE_URL: `file:${dbFile}`,
        // per-launch token injected via env; the service middleware (W3 T173)
        // will validate it for privileged endpoints. Renderer never sees it.
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
    proc.stderr.on("data", (d) => process.stderr.write(`[service] ${d}`));
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
        { host: "127.0.0.1", port, path: "/api/symphony/state", timeout: 2000 },
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
    }
    return { action: "deny" };
  });

  // NFR-012 — deny permissions the renderer does not need.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(new Set(["clipboard-read", "clipboard-sanitized-write"]).has(permission));
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  mainWindow.loadURL(origin);
  mainWindow.on("closed", () => { mainWindow = null; });
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
    return u.protocol === "https:" && /^([a-z0-9-]+\.)?(github\.com|deepgram\.com|openai\.com)$/.test(u.hostname);
  } catch { return false; }
}
function redact(s) { return String(s).replace(/token=[^&\s]+/gi, "token=REDACTED"); }

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

// ========================================================================
// recovery surface (DAS-004)
// ========================================================================
function showRecovery(reason) {
  if (mainWindow) mainWindow.destroy();
  mainWindow = new BrowserWindow({ width: 600, height: 380, show: !HEADLESS, title: "DeepListener", icon: APP_ICON });
  mainWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(
      `<meta charset="utf-8"><title>DeepListener</title>` +
      `<body style="font-family:-apple-system,sans-serif;padding:2em;color:#222;background:#fafafa">` +
      `<h1>DeepListener could not start</h1><p>${reason}</p>` +
      `<p>You can quit and try again, or open diagnostics.</p></body>`,
    ),
  );
  logError(`recovery shown: ${reason}`);
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
    Menu.setApplicationMenu(null);
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
      log(`data root: ${dataRoot}`);
      log(`launch id: ${LAUNCH_ID} (token redacted)`);

      const dbFile = await ensureDatabaseReady(dataRoot);
      servicePort = await pickFreeLoopbackPort();
      serviceProcess = await startService(servicePort, dataRoot, dbFile);
      await waitForHealth(servicePort);
      log(`service healthy on 127.0.0.1:${servicePort}`);
      createWindow(`http://127.0.0.1:${servicePort}`);
      if (HEADLESS) setTimeout(() => shutdown(), 1500);
    } catch (err) {
      logError(`startup failed: ${err.message}`);
      showRecovery(err.message);
      if (HEADLESS) setTimeout(() => shutdown(), 2000);
    }
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") shutdown(); });
  app.on("before-quit", shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
