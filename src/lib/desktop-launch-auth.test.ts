import test from "node:test";
import assert from "node:assert/strict";
import {
  DESKTOP_LAUNCH_TOKEN_HEADER,
  desktopLaunchAuthEnabled,
  hasValidDesktopLaunchToken,
} from "./desktop-launch-auth";

test("Desktop launch authorization is opt-in", () => {
  assert.equal(desktopLaunchAuthEnabled({ DEEPLISTENER_LAUNCH_TOKEN: "secret" }), false);
  assert.equal(
    desktopLaunchAuthEnabled({
      DEEPLISTENER_REQUIRE_LAUNCH_TOKEN: "1",
      DEEPLISTENER_LAUNCH_TOKEN: "secret",
    }),
    true,
  );
  assert.equal(
    desktopLaunchAuthEnabled({
      DEEPLISTENER_REQUIRE_LAUNCH_TOKEN: "1",
      DEEPLISTENER_LAUNCH_TOKEN: "   ",
    }),
    false,
  );
});

test("Desktop launch token comparison accepts only the exact value", () => {
  assert.equal(hasValidDesktopLaunchToken("abc123", "abc123"), true);
  assert.equal(hasValidDesktopLaunchToken("abc124", "abc123"), false);
  assert.equal(hasValidDesktopLaunchToken("abc1234", "abc123"), false);
  assert.equal(hasValidDesktopLaunchToken("abc12", "abc123"), false);
  assert.equal(hasValidDesktopLaunchToken("", "abc123"), false);
  assert.equal(hasValidDesktopLaunchToken(null, "abc123"), false);
});

test("Desktop launch token header is not a URL or renderer API", () => {
  assert.equal(DESKTOP_LAUNCH_TOKEN_HEADER, "x-deeplistener-launch-token");
});
