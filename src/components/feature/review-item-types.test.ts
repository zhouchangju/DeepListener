import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("practice audio flow accepts nullable review item notes from Prisma", () => {
  const practiceClientSource = readFileSync(
    new URL("../../app/practice/[id]/PracticeClient.tsx", import.meta.url),
    "utf8"
  );
  const audioPlayerSource = readFileSync(new URL("./AudioPlayer.tsx", import.meta.url), "utf8");
  const sentenceListSource = readFileSync(
    new URL("./audio-player/SentenceList.tsx", import.meta.url),
    "utf8"
  );

  const nullableUserNotePattern = /userNote\?:\s*string\s*\|\s*null/;

  assert.match(practiceClientSource, nullableUserNotePattern);
  assert.match(audioPlayerSource, nullableUserNotePattern);
  assert.match(sentenceListSource, nullableUserNotePattern);
});
