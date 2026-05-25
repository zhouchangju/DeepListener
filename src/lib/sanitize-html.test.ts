import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml } from "./sanitize-html";

test("sanitizeHtml removes dangerous tags and event handlers", () => {
  const html = `<p onclick="alert(1)">Hi</p><script>alert(1)</script><iframe src="https://evil.test"></iframe>`;
  const sanitized = sanitizeHtml(html);

  assert.equal(sanitized.includes("onclick"), false);
  assert.equal(sanitized.includes("<script"), false);
  assert.equal(sanitized.includes("<iframe"), false);
  assert.equal(sanitized.includes("Hi"), true);
});

test("sanitizeHtml removes unquoted event handlers", () => {
  const sanitized = sanitizeHtml(`<img src="/uploads/a.mp3" onerror=alert(1)>`);

  assert.equal(sanitized.includes("onerror"), false);
  assert.equal(sanitized.includes("alert"), false);
});

test("sanitizeHtml rejects encoded javascript and data URLs", () => {
  const sanitized = sanitizeHtml(
    `<a href="&#106;avascript:alert(1)">bad</a><img src="data:text/html,<svg onload=alert(1)>">`
  );

  assert.equal(sanitized.includes("href="), false);
  assert.equal(sanitized.includes("src="), false);
  assert.equal(sanitized.includes("javascript"), false);
  assert.equal(sanitized.includes("data:"), false);
});

test("sanitizeHtml preserves safe rich text formatting", () => {
  const sanitized = sanitizeHtml(
    `<p><b>Bold</b> <span style="color: #EF4444; font-size: 18px; background-image: url(javascript:alert(1))">red</span><font color="#3B82F6" size="5">blue</font></p>`
  );

  assert.equal(sanitized.includes("<b>Bold</b>"), true);
  assert.equal(sanitized.includes("color: #EF4444"), true);
  assert.equal(sanitized.includes("font-size: 18px"), true);
  assert.equal(sanitized.includes("background-image"), false);
  assert.equal(sanitized.includes("<font color=\"#3B82F6\" size=\"5\">blue</font>"), true);
});
