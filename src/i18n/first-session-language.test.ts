import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translations } from "../app/landing-translations";

const localeMessages = {
  en: JSON.parse(readFileSync(new URL("../../messages/en.json", import.meta.url), "utf8")) as Record<string, unknown>,
  "zh-CN": JSON.parse(readFileSync(new URL("../../messages/zh-CN.json", import.meta.url), "utf8")) as Record<string, unknown>,
};

const INTERNAL_TERMS = [
  /\bDATABASE_URL\b/i,
  /\bPrisma\b/i,
  /\bUNLEARNT\b/i,
  /\bFSRS\b/i,
  /\bBYOK\b/i,
  /\bSQLite\b/i,
];

function collectStrings(value: unknown, path: string, output: Array<{ path: string; value: string }>) {
  if (typeof value === "string") {
    output.push({ path, value });
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value)) {
    collectStrings(child, path ? `${path}.${key}` : key, output);
  }
}

function assertFirstSessionCopyIsLearnerFacing(surface: string, value: unknown) {
  const strings: Array<{ path: string; value: string }> = [];
  collectStrings(value, surface, strings);
  const violations = strings.flatMap(({ path, value: text }) =>
    INTERNAL_TERMS.filter((term) => term.test(text)).map((term) => ({ path, term: term.source, text })),
  );
  assert.deepEqual(violations, [], `${surface} exposes internal terms in first-session copy`);
}

function getPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

const FIRST_SESSION_PATHS = [
  "onboarding",
  "landing",
  "practice.demo",
  "library.emptyTitle",
  "library.emptyBody",
  "library.demoTrackTitle",
  "library.checkSetup",
  "library.importMedia",
  "library.batchImport",
  "library.importTip",
  "library.importMediaTitle",
  "library.importMediaDesc",
  "library.importWithSubtitles",
  "library.openSubtitleImport",
  "library.subtitleImportTitle",
  "library.subtitleImportDesc",
  "library.subtitleChooseMedia",
  "library.chooseMedia",
  "library.subtitleOptional",
  "library.subtitleChooseHint",
  "library.chooseSubtitle",
  "library.noProviderSubtitleHint",
  "library.noProviderAudioHint",
  "library.noProviderBatchHint",
  "library.openProviderSetup",
  "library.subtitleInvalid",
  "library.startImport",
  "library.processingStatus",
  "library.chooseFile",
  "library.chooseFolder",
  "library.batchTitle",
  "library.batchDesc",
  "library.recoveryTitle",
  "library.recoveryBody",
  "library.recoveryReady",
  "library.recoveryInterrupted",
  "library.recoveryProcessing",
  "library.recoveryFailed",
  "library.recoveryRetry",
  "library.recoveryChangeProvider",
  "library.recoveryProviderLabel",
  "library.recoveryOpenSetup",
  "library.recoveryChangeSubtitle",
  "library.recoveryDelete",
  "library.recoveryRetryStarted",
  "library.recoveryRetrying",
  "library.recoveryRetryAnnounced",
  "library.recoveryRetryFailed",
  "library.recoveryDeleteFailed",
  "library.recoveryLoadFailed",
  "setup.decisionGuide.recommended",
  "setup.decisionGuide.recommendedReason",
] as const;

const INTERNAL_TERMS_IN_DEFAULT_COPY = [
  /\bDATABASE_URL\b/i,
  /\bPrisma\b/i,
  /\bUNLEARNT\b/i,
  /\bFSRS\b/i,
  /\bBYOK\b/i,
  /\bSQLite\b/i,
  /\bTRANSCRIPTION_PROVIDER\b/i,
  /\bDEEPGRAM_API_KEY\b/i,
  /\bOPENAI_API_KEY\b/i,
  /\bGOOGLE_API_KEY\b/i,
  /\bffprobe?\b/i,
  /\bnpx prisma\b/i,
];

test("landing translations keep internal implementation terms out of the first session", () => {
  assertFirstSessionCopyIsLearnerFacing("landing.en", translations.en);
  assertFirstSessionCopyIsLearnerFacing("landing.zh-CN", translations["zh-CN"]);
});

test("first-session message surfaces keep technical implementation terms out of default copy", () => {
  for (const [locale, messages] of Object.entries(localeMessages)) {
    for (const path of FIRST_SESSION_PATHS) {
      const value = getPath(messages, path);
      assert.notEqual(value, undefined, `${locale}.${path} should exist`);
      assertFirstSessionCopyIsLearnerFacing(`${locale}.${path}`, value);
    }
  }
});

test("first-session copy explains the no-key paths without API jargon", () => {
  for (const [locale, messages] of Object.entries(localeMessages)) {
    const noKeyPaths = [
      "landing",
      "library.subtitleImportDesc",
      "library.subtitleChooseHint",
    ];
    for (const path of noKeyPaths) {
      const value = getPath(messages, path);
      const strings: Array<{ path: string; value: string }> = [];
      collectStrings(value, `${locale}.${path}`, strings);
      assert.ok(strings.length > 0, `${locale}.${path} should contain learner-facing copy`);
      assert.ok(strings.every(({ value: text }) => !/\bAPI key\b|API 密钥/i.test(text)),
        `${locale}.${path} should use service-key wording`);
    }
  }
});

test("embedded-subtitle guidance matches the supported media path", () => {
  const embeddedEnglish = String(getPath(localeMessages.en, "setup.decisionGuide.embedded.body"));
  const embeddedChinese = String(getPath(localeMessages["zh-CN"], "setup.decisionGuide.embedded.body"));

  assert.match(embeddedEnglish, /video/i);
  assert.doesNotMatch(embeddedEnglish, /audio\s+or\s+video/i);
  assert.match(embeddedChinese, /视频/);
  assert.doesNotMatch(embeddedChinese, /音频或视频/);
});

test("technical setup details remain scoped to the setup recovery surface", () => {
  const setup = localeMessages.en.setup as Record<string, unknown>;
  const setupStrings: Array<{ path: string; value: string }> = [];
  collectStrings(setup, "setup", setupStrings);
  const technicalPaths = setupStrings
    .filter(({ value }) => INTERNAL_TERMS.some((term) => term.test(value)))
    .map(({ path }) => path);

  assert.ok(technicalPaths.length > 0, "setup should retain actionable advanced details");
  assert.ok(technicalPaths.every((path) => path.startsWith("setup.readiness.")),
    `technical details escaped the setup readiness disclosure: ${technicalPaths.join(", ")}`);
});

test("Chinese first-session practice copy does not expose untranslated jargon", () => {
  const shadowing = (localeMessages["zh-CN"].feature as Record<string, unknown>)?.shadowingConsole as Record<string, unknown>;
  const modeTitle = String(shadowing?.shadowingModeTitle ?? "");
  assert.doesNotMatch(modeTitle, /\bChunk\b/i);
});

test("first-session locale paths keep implementation terms out of both languages", () => {
  for (const [locale, messages] of Object.entries(localeMessages)) {
    for (const path of FIRST_SESSION_PATHS) {
      const strings: Array<{ path: string; value: string }> = [];
      collectStrings(getPath(messages, path), `${locale}.${path}`, strings);
      const violations = strings.flatMap(({ path: stringPath, value }) =>
        INTERNAL_TERMS_IN_DEFAULT_COPY.filter((term) => term.test(value)).map((term) => ({
          path: stringPath,
          term: term.source,
          value,
        })),
      );
      assert.deepEqual(violations, [], `${locale}.${path} exposes implementation terms`);
    }
  }
});
