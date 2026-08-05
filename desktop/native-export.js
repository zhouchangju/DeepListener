/**
 * Pure validation helpers for native Desktop exports.
 *
 * The Electron main process fetches diagnostics from the local allow-listed
 * API, then validates the document before showing a native save dialog. The
 * renderer never supplies a destination path or arbitrary file contents.
 */
const MAX_DIAGNOSTICS_BYTES = 2 * 1024 * 1024;
const TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "generatedAt",
  "app",
  "runtime",
  "checks",
  "provider",
  "startup",
  "logs",
]);

function validateDiagnosticsJson(value) {
  if (typeof value !== "string") return { ok: false, code: "INVALID_PAYLOAD" };
  if (Buffer.byteLength(value, "utf8") > MAX_DIAGNOSTICS_BYTES) {
    return { ok: false, code: "PAYLOAD_TOO_LARGE" };
  }

  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, code: "INVALID_PAYLOAD" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.schemaVersion !== 1) {
    return { ok: false, code: "INVALID_PAYLOAD" };
  }
  if (Object.keys(parsed).some((key) => !TOP_LEVEL_KEYS.has(key))) {
    return { ok: false, code: "INVALID_PAYLOAD" };
  }

  return {
    ok: true,
    content: `${JSON.stringify(parsed, null, 2)}\n`,
  };
}

module.exports = {
  MAX_DIAGNOSTICS_BYTES,
  validateDiagnosticsJson,
};
