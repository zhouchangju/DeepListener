import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/library/TrackList.tsx"), "utf8");

test("library track card labels are localized", () => {
  assert.match(source, /"aria-label": t\("openTrack", \{ title: displayTitle \}\)/);
  assert.match(source, /aria-label=\{t\("selectTrack", \{ title: displayTitle \}\)\}/);
  assert.doesNotMatch(source, /aria-label=\{`(?:Open|Select) \$\{track\.title\}`\}/);
});
