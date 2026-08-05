const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const test = require("node:test");
const { createBoundedLogWriter } = require("./bounded-log.js");

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "deeplistener-bounded-log-"));
}

test("bounded logger rotates and retains only the configured history", () => {
  const root = tempRoot();
  try {
    const writer = createBoundedLogWriter({ directory: path.join(root, "logs"), maxBytes: 32, maxFiles: 3 });
    assert.equal(writer.write("first-entry-1234567890\n"), true);
    assert.equal(writer.write("second-entry-1234567890\n"), true);
    assert.equal(writer.write("third-entry-1234567890\n"), true);
    assert.equal(writer.write("fourth-entry-1234567890\n"), true);
    const files = fs.readdirSync(path.join(root, "logs")).sort();
    assert.deepEqual(files, ["desktop.log", "desktop.log.1", "desktop.log.2"]);
    for (const file of files) assert.ok(fs.statSync(path.join(root, "logs", file)).size <= 32);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("bounded logger fails closed when its directory cannot be created", () => {
  const root = tempRoot();
  try {
    const blocker = path.join(root, "not-a-directory");
    fs.writeFileSync(blocker, "block");
    const writer = createBoundedLogWriter({ directory: path.join(blocker, "logs"), maxBytes: 32 });
    assert.equal(writer.write("this must not throw\n"), false);
    assert.equal(writer.isDisabled(), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
