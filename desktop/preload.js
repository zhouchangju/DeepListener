/**
 * DeepListener Desktop — preload (W3 T172).
 *
 * contextIsolation=true runs this in an isolated world. It exposes ONLY a
 * narrow, validated bridge on window.deepListener. No fs, no shell, no
 * ipcRenderer passthrough. The token is never returned to the renderer.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deepListener", {
  // Returns { ok, launchId } — never the secret token.
  ping: () => ipcRenderer.invoke("app:ping"),
  // Non-secret version for diagnostics.
  version: () => ipcRenderer.invoke("app:version"),
  // Recovery-only actions. The main process validates the sender and never
  // exposes fs, shell, or arbitrary IPC to the renderer.
  retryStartup: () => ipcRenderer.invoke("startup:retry"),
  openDiagnostics: () => ipcRenderer.invoke("startup:open-diagnostics"),
  // The main process fetches and validates the redacted diagnostics itself,
  // then opens a native save dialog. No renderer-supplied path or fs handle.
  saveDiagnostics: () => ipcRenderer.invoke("diagnostics:save"),
  // Native directory chooser actions. Paths stay in the main process.
  exportBackup: () => ipcRenderer.invoke("backup:export"),
  importBackup: () => ipcRenderer.invoke("backup:import"),
  // Subscribe to external-navigation denials so the renderer can show a toast
  // when a window.open to a non-allowlisted origin is blocked. The URL is
  // already redacted of tokens by the main process. Returns an unsubscribe fn.
  onExternalBlocked: (cb) => {
    if (typeof cb !== "function") return () => {};
    const listener = (_event, payload) => {
      try { cb(payload); } catch { /* renderer callback error — swallow */ }
    };
    ipcRenderer.on("external-blocked", listener);
    return () => ipcRenderer.removeListener("external-blocked", listener);
  },
});
