import test from "node:test";
import assert from "node:assert/strict";
import { downloadResponseBlob, getFilenameFromContentDisposition } from "./client-download";

test("getFilenameFromContentDisposition reads quoted filenames", () => {
  assert.equal(
    getFilenameFromContentDisposition('attachment; filename="DeepListener_Export.mp3"', "fallback.mp3"),
    "DeepListener_Export.mp3"
  );
});

test("getFilenameFromContentDisposition reads unquoted and encoded filenames", () => {
  assert.equal(
    getFilenameFromContentDisposition("attachment; filename=DeepListener_Export.mp3", "fallback.mp3"),
    "DeepListener_Export.mp3"
  );
  assert.equal(
    getFilenameFromContentDisposition(
      "attachment; filename*=UTF-8''DeepListener%20Notes.txt",
      "fallback.txt",
    ),
    "DeepListener Notes.txt"
  );
});

test("getFilenameFromContentDisposition falls back for missing or unsafe names", () => {
  assert.equal(getFilenameFromContentDisposition(null, "fallback.mp3"), "fallback.mp3");
  assert.equal(getFilenameFromContentDisposition('attachment; filename="../bad.mp3"', "fallback.mp3"), "fallback.mp3");
  assert.equal(getFilenameFromContentDisposition('attachment; filename="bad\u0000name.mp3"', "fallback.mp3"), "fallback.mp3");
});

test("downloadResponseBlob creates a temporary link and revokes the object url", async () => {
  const anchor = {
    download: "",
    href: "",
    clicked: false,
    click() {
      this.clicked = true;
    },
  };
  const appended: object[] = [];
  const removed: object[] = [];
  const revoked: string[] = [];

  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: {
        appendChild(element: object) {
          appended.push(element);
          return element;
        },
        removeChild(element: object) {
          removed.push(element);
          return element;
        },
      },
      createElement(tagName: string) {
        assert.equal(tagName, "a");
        return anchor;
      },
    } as unknown as Document,
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => "blob:deeplistener-test",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (url: string) => {
      revoked.push(url);
    },
  });

  try {
    const response = new Response("audio-bytes", {
      headers: {
        "Content-Disposition": 'attachment; filename="DeepListener_Export.mp3"',
      },
    });

    await downloadResponseBlob(response, "fallback.mp3");

    assert.equal(anchor.href, "blob:deeplistener-test");
    assert.equal(anchor.download, "DeepListener_Export.mp3");
    assert.equal(anchor.clicked, true);
    assert.deepEqual(appended, [anchor]);
    assert.deepEqual(removed, [anchor]);
    assert.deepEqual(revoked, ["blob:deeplistener-test"]);
  } finally {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  }
});
