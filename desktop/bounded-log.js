/**
 * Small synchronous file logger for the Electron main process.
 *
 * The caller is responsible for redacting the message before calling
 * `write`. This module only owns bounded persistence: it keeps one active log
 * plus a finite number of rotated siblings and silently disables file output
 * if the user-data directory is unavailable. stdout/stderr remain the
 * startup fallback in that case.
 */
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_MAX_FILES = 3;

function createBoundedLogWriter(options = {}) {
  const directory = typeof options.directory === "string" ? path.resolve(options.directory) : null;
  const fileName = typeof options.fileName === "string" && path.basename(options.fileName) === options.fileName
    ? options.fileName
    : "desktop.log";
  const maxBytes = Number.isSafeInteger(options.maxBytes) && options.maxBytes > 0
    ? options.maxBytes
    : DEFAULT_MAX_BYTES;
  const maxFiles = Number.isSafeInteger(options.maxFiles) && options.maxFiles >= 1
    ? options.maxFiles
    : DEFAULT_MAX_FILES;
  const filePath = directory ? path.join(directory, fileName) : null;
  let disabled = !directory;

  function rotateIfNeeded(nextBytes) {
    if (!filePath || disabled) return;
    let currentBytes = 0;
    try {
      currentBytes = fs.statSync(filePath).size;
    } catch (error) {
      if (error && error.code !== "ENOENT") throw error;
    }
    if (currentBytes === 0 || currentBytes + nextBytes <= maxBytes) return;

    if (maxFiles > 1) fs.rmSync(`${filePath}.${maxFiles - 1}`, { force: true });
    for (let index = maxFiles - 2; index >= 1; index -= 1) {
      const from = `${filePath}.${index}`;
      const to = `${filePath}.${index + 1}`;
      try {
        fs.rmSync(to, { force: true });
        fs.renameSync(from, to);
      } catch (error) {
        if (error && error.code !== "ENOENT") throw error;
      }
    }
    if (maxFiles > 1) {
      fs.rmSync(`${filePath}.1`, { force: true });
      fs.renameSync(filePath, `${filePath}.1`);
    } else {
      fs.rmSync(filePath, { force: true });
    }
  }

  function write(message) {
    if (disabled || !filePath) return false;
    try {
      fs.mkdirSync(directory, { recursive: true });
      let payload = Buffer.from(String(message), "utf8");
      if (payload.length > maxBytes) payload = payload.subarray(payload.length - maxBytes);
      rotateIfNeeded(payload.length);
      fs.appendFileSync(filePath, payload);
      return true;
    } catch {
      // A read-only/full disk must never turn a startup error into a crash.
      disabled = true;
      return false;
    }
  }

  return {
    filePath,
    maxBytes,
    maxFiles,
    write,
    isDisabled: () => disabled,
  };
}

module.exports = { createBoundedLogWriter };
