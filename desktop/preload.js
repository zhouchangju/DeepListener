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
});
