#!/usr/bin/env node
/**
 * Replace the bundled demo audio and its sentence timeline.
 *
 * The shipped demo (`public/demo/demo-listening.mp3`) is a 5-second synthetic
 * sine wave with only two hand-authored sentence cues — it cannot demonstrate
 * sentence-level listening (see docs/desktop-w0/demo-script.md §1).
 *
 * This script lets a maintainer drop in a REAL spoken-English clip and a
 * matching sentence timeline in one step:
 *
 *   1. Place your audio at the path you pass as --audio (any format ffmpeg can
 *      decode; will be re-encoded to mono MP3 ~64kbps for small bundle size).
 *   2. Provide a timeline as JSON via --timeline (see --example-timeline).
 *   3. The script:
 *        - encodes the audio to public/demo/demo-listening.mp3,
 *        - patches DEMO_SENTENCES in src/lib/demo-seed.ts,
 *        - recomputes the sha256 checksum,
 *        - rewrites public/demo/PROVENANCE.md.
 *
 * Usage:
 *   node scripts/replace-demo-audio.mjs \
 *     --audio ~/recordings/my-demo.m4a \
 *     --timeline scripts/demo-timeline.example.json
 *
 * Requirements: ffmpeg on PATH (this is a maintainer script, not shipped).
 *
 * Provenance: you MUST record the source/license of your audio in the
 * regenerated PROVENANCE.md (the script opens it for editing guidance).
 */
import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync, renameSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const { values } = parseArgs({
  options: {
    audio: { type: "string" },
    timeline: { type: "string" },
    source: { type: "string" },
    license: { type: "string" },
    "example-timeline": { type: "boolean" },
    help: { type: "boolean" },
  },
});

if (values.help || (!values.audio && !values["example-timeline"])) {
  console.log(`Usage:
  node scripts/replace-demo-audio.mjs --audio <path> --timeline <timeline.json> \\
    --source <public source description> --license <redistribution license>
  node scripts/replace-demo-audio.mjs --example-timeline   # print a sample timeline JSON

Options:
  --audio <path>        Source audio (any ffmpeg-decodable format).
  --timeline <path>     JSON file: [{ "text": "...", "start": 0.0, "end": 2.5 }, ...]
  --source <text>       Public provenance (author, catalog URL, or TTS engine/model).
  --license <text>      License that explicitly permits redistribution.
  --example-timeline    Print a sample timeline and exit.
`);
  process.exit(values.help ? 0 : 1);
}

const EXAMPLE_TIMELINE = [
  { text: "Welcome to DeepListener — let's practice sentence-level listening.", start: 0, end: 3.2 },
  { text: "First, just listen. Don't read anything yet.", start: 3.2, end: 6.0 },
  { text: "English rhythm carries meaning that single words miss.", start: 6.0, end: 9.8 },
  { text: "Try to catch the stressed words in this sentence.", start: 9.8, end: 13.0 },
  { text: "When you're ready, reveal the text and compare.", start: 13.0, end: 16.4 },
  { text: "Capture any sentence you want to review later.", start: 16.4, end: 19.6 },
];

if (values["example-timeline"]) {
  console.log(JSON.stringify(EXAMPLE_TIMELINE, null, 2));
  process.exit(0);
}

const AUDIO_SRC = values.audio;
const TIMELINE_PATH = values.timeline;
const SOURCE = values.source?.trim();
const LICENSE = values.license?.trim();

if (!AUDIO_SRC || !TIMELINE_PATH || !SOURCE || !LICENSE) {
  console.error("--audio, --timeline, --source, and --license are required.");
  process.exit(1);
}
if (!existsSync(AUDIO_SRC)) {
  console.error(`Audio not found: ${AUDIO_SRC}`);
  process.exit(1);
}
if (!existsSync(TIMELINE_PATH)) {
  console.error(`Timeline not found: ${TIMELINE_PATH}`);
  process.exit(1);
}
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
} catch {
  console.error("ffmpeg and ffprobe are required on PATH. Install them: brew install ffmpeg");
  process.exit(1);
}

// Validate timeline.
const timeline = JSON.parse(readFileSync(TIMELINE_PATH, "utf8"));
validateTimeline(timeline);

// Prepare every replacement before touching a tracked asset. Each final rename
// is atomic, and the catch block restores the original files if a later rename
// fails, so an invalid clip cannot leave the demo half-updated.
const DEST_AUDIO = path.join(ROOT, "public/demo/demo-listening.mp3");
const SEED_PATH = path.join(ROOT, "src/lib/demo-seed.ts");
const PROVENANCE_PATH = path.join(ROOT, "public/demo/PROVENANCE.md");
const suffix = `.replace-${process.pid}.tmp`;
const stagedAudio = `${DEST_AUDIO}${suffix}`;
const stagedSeed = `${SEED_PATH}${suffix}`;
const stagedProvenance = `${PROVENANCE_PATH}${suffix}`;
const stagedFiles = [stagedAudio, stagedSeed, stagedProvenance];
process.on("exit", () => {
  for (const staged of stagedFiles) rmSync(staged, { force: true });
});
const originals = new Map([
  [DEST_AUDIO, readFileSync(DEST_AUDIO)],
  [SEED_PATH, readFileSync(SEED_PATH)],
  [PROVENANCE_PATH, readFileSync(PROVENANCE_PATH)],
]);

console.log(`[1/4] Encoding ${path.basename(AUDIO_SRC)} → public/demo/demo-listening.mp3`);
execFileSync(
  "ffmpeg",
  ["-y", "-i", AUDIO_SRC, "-ac", "1", "-ar", "22050", "-b:a", "64k", "-f", "mp3", stagedAudio],
  { stdio: "inherit" },
);

const durationSec = Number(
  execFileSync("ffprobe", [
    "-v", "error", "-show-entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", stagedAudio,
  ]).toString().trim(),
);
if (!Number.isFinite(durationSec) || durationSec <= 0) {
  throw new Error("ffprobe did not report a valid positive duration.");
}
validateTimeline(timeline, durationSec);

// 2. Patch DEMO_SENTENCES in src/lib/demo-seed.ts.
console.log(`[2/4] Patching timeline in ${path.relative(ROOT, SEED_PATH)}`);
const originalSeed = readFileSync(SEED_PATH, "utf8");
const newEntries = timeline
  .map(
    (s) =>
      `  { text: ${JSON.stringify(s.text)}, start: ${s.start.toFixed(2)}, end: ${s.end.toFixed(2)} },`,
  )
  .join("\n");
const seed = originalSeed.replace(
  /const DEMO_SENTENCES[\s\S]*?\];/,
  `const DEMO_SENTENCES: Array<{ text: string; start: number; end: number }> = [\n${newEntries}\n];`,
);
if (seed === originalSeed) {
  throw new Error("Could not find DEMO_SENTENCES in src/lib/demo-seed.ts.");
}
writeFileSync(stagedSeed, seed);

// 3. Recompute checksum.
const checksum = createHash("sha256").update(readFileSync(stagedAudio)).digest("hex");
console.log(`[3/4] New sha256: ${checksum}`);

// 4. Rewrite PROVENANCE.md.
writeFileSync(
  stagedProvenance,
  buildProvenance({ checksum, durationSec, sentenceCount: timeline.length, source: SOURCE, license: LICENSE }),
);
try {
  renameSync(stagedAudio, DEST_AUDIO);
  renameSync(stagedSeed, SEED_PATH);
  renameSync(stagedProvenance, PROVENANCE_PATH);
  console.log(`[4/4] Rewrote ${path.relative(ROOT, PROVENANCE_PATH)}`);
} catch (error) {
  for (const [target, contents] of originals) writeFileSync(target, contents);
  throw error;
} finally {
  for (const staged of stagedFiles) {
    rmSync(staged, { force: true });
  }
}

console.log(`\nDone. Next steps:`);
console.log(`  - Run: npm run verify:quick`);
console.log(`  - Optionally re-seed in a running dev app: DELETE /api/demo then POST /api/demo`);

function validateTimeline(arr, durationSec = Number.POSITIVE_INFINITY) {
  if (!Array.isArray(arr) || arr.length < 2) {
    throw new Error("Timeline must be an array of at least 2 entries.");
  }
  for (const [i, s] of arr.entries()) {
    if (typeof s.text !== "string" || !s.text.trim()) {
      throw new Error(`Timeline[${i}].text must be a non-empty string.`);
    }
    if (typeof s.start !== "number" || typeof s.end !== "number" || s.start < 0 || s.end <= s.start) {
      throw new Error(`Timeline[${i}] has invalid start/end (need 0 <= start < end).`);
    }
    if (i > 0 && s.start < arr[i - 1].end) {
      throw new Error(`Timeline[${i}] overlaps or is out of order.`);
    }
    if (s.end > durationSec + 0.05) {
      throw new Error(`Timeline[${i}] ends after the audio duration (${durationSec.toFixed(2)}s).`);
    }
  }
}

function buildProvenance({ checksum, durationSec, sentenceCount, source, license }) {
  const today = new Date().toISOString().slice(0, 10);
  return `# Demo Asset Provenance (DFS-002)

DeepListener ships one bundled demo so a new user can experience the
sentence-level learning loop without an API key or media import.

## Audio

| Asset | Path | Source | License |
|---|---|---|---|
| \`demo-listening.mp3\` | \`public/demo/demo-listening.mp3\` | ${source} | ${license} |

Duration: ${durationSec.toFixed(1)}s. Encoded to mono 22.05 kHz MP3 @ 64 kbps
for small bundle size. Speech needs little bitrate; this is intentionally
compact.

## Timeline

The bundled sentence timeline is authored in \`src/lib/demo-seed.ts\`
(\`DEMO_SENTENCES\`). It contains ${sentenceCount} sentence cues mapped to time
offsets within the clip. No provider transcription call is made for the demo
(DFS-002: the demo path never contacts an external provider).

Re-generated on ${today} by \`scripts/replace-demo-audio.mjs\`.

## Ownership / isolation

Demo records use \`Track.trackType = "DEMO"\` so they are distinguishable from
personal library data and removable without affecting personal tracks, notes,
or review history (DFS-004). See \`src/lib/demo-seed.ts\`.

## Checksum

\`\`\`
${checksum}  public/demo/demo-listening.mp3
\`\`\`

The replacement command intentionally records public provenance rather than a
maintainer's machine-local source path.
`;
}
