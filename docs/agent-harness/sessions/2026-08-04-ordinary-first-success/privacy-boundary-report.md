# T311 Privacy Boundary Repor

Date: 2026-08-04
Scope: OFS-004, OFS-005, OFS-006, OFS-007, OFS-010
Mode: Adversarial evidence review with disposable roots and fake Provider adapters

## Resul

The automated privacy boundary is passing for the paths that can be exercised
without real credentials or a real external request. The tests prove that a
Demo or Setup page open does not construct a transcription client, a valid SRT
sidecar does not construct or call a Provider, and the explicit connectivity
probe calls only the Provider selected by the learner. Temporary probe media is
removed before the request returns.

This report does not claim a live Provider/network E2E or release acceptance.
Those require user-owned credentials, a controlled endpoint, and the remaining
human gates.

## Request matrix

| Surface | Expected external request | Evidence | Result |
| --- | --- | --- | --- |
| Demo GET/POST/DELETE | None | `src/app/api/demo/route.structure.test.ts`; `src/lib/demo-seed.test.ts` | Pass: route has no Provider/fetch path and only seeds bundled timeline data. |
| Setup decision guide open | None | `src/app/setup/page.structure.test.ts` | Pass: server-rendered guide contains static guidance only. |
| Provider dialog open/save | Save calls only local `/api/setup/provider`; no probe on open | `src/app/setup/ProviderConfigDialog.structure.test.ts`; `src/app/api/setup/provider/route.test.ts` | Pass: keys are never returned; probe is a separate explicit action. |
| Explicit Provider connectivity test | Exactly one request to selected Provider | `src/app/api/setup/provider/test/route.test.ts` using injected fake adapter | Pass: `openai`/`google` selection is counted; response contains only status and sentence count. |
| SRT/VTT sidecar import | None | `src/lib/import-jobs/run.test.ts` | Pass: Provider factory call count remains zero and the Track activates from sidecar segments. |
| Import without sidecar | One selected Provider attempt | `src/lib/import-jobs/provider-failure-injection.test.ts` | Pass: retries record the selected Provider and fence late results. |
| Retry/change Provider | One new selected attempt; no key in manifest | `src/lib/import-jobs/provider-failure-injection.test.ts`; `src/lib/import-jobs/transcription-attempt.test.ts` | Pass: safe Provider ID/attempt metadata only. |
| Import status/list responses | No absolute paths, raw subtitle text, or secrets | `src/app/api/import-jobs/route.test.ts`; `src/lib/import-jobs/manifest.test.ts` | Pass: public projection excludes private artifact paths/content. |

## Redaction checks

- The fake Provider response containing `apiKey`, a private transcript, and
  secret-like text is not returned by the connectivity route.
- A fake Provider exception containing a secret and private transcript is
  reduced to a safe error code; the captured diagnostic contains only the code.
- Provider SDK errors, Gemini response text, embedded-subtitle errors, upload
  errors, and import-route errors are no longer passed as raw objects to logs.
- Desktop main-process diagnostics redact credentials and absolute private paths
  before writing startup, FFmpeg, navigation, or renderer-failure messages.
- Server startup diagnostics record only fixed stages/counts and error
  categories; database and secrets-file absolute paths are omitted.
- Import manifests persist operation metadata and safe error categories, no
  Provider credentials or raw sidecar text. The learner's activated transcrip
  remains local Track data by design and is not sent on the sidecar path.

## Verification

```tex
node --import tsx --tes
  src/app/api/setup/provider/test/route.test.ts
  src/app/setup/page.structure.test.ts
  src/app/api/demo/route.structure.test.ts
  src/lib/import-jobs/run.test.ts
  src/lib/import-jobs/provider-failure-injection.test.ts
  src/lib/import-jobs/transcription-attempt.test.ts
  src/app/api/import-jobs/route.test.ts
```

The focused boundary suite passed on Windows with no real key, external
Provider call, active database, or user media.

## Remaining limitations

- No real Provider network/quota E2E was run; this is intentionally deferred
  until a controlled test account/endpoint is supplied.
- The bundled Demo audio is still synthetic and HG-01 (real spoken-English
  asset, provenance, and redistribution approval) remains open.
- HG-03 packaging/signing and HG-04 manual accessibility/target-user evidence
  remain open. T311 does not close OFS-010 by itself.
