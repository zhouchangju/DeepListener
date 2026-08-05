import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { getTranscriptionProviderFor } from "@/lib/transcription/factory";
import {
  PROVIDER_IDS,
  setProviderVerificationStatus,
  type ProviderId,
} from "@/lib/secrets-store";
import { withProviderCredential } from "@/lib/secrets-store";
import type { TranscriptionProvider, TranscriptionProviderConfig } from "@/lib/transcription/types";
import { getUploadMediaKind, MAX_AUDIO_UPLOAD_BYTES, sanitizeUploadFilename, validateUploadFileMetadata } from "@/lib/upload-policy";
import { toPublicUploadError } from "@/lib/upload-error";

export const maxDuration = 120;
const PROVIDER_TEST_TIMEOUT_MS = 60_000;

export type ProviderConnectivityFactory = ((provider: ProviderId, config?: TranscriptionProviderConfig) => TranscriptionProvider) & {
  /** Test-only seam marker for factories that intentionally accept credentials. */
  credentialScope?: boolean;
};
export type ProviderCredentialReader = <T>(provider: ProviderId, operation: (credential: string) => Promise<T> | T) => Promise<T>;

/**
 * Explicit, user-triggered provider probe. It accepts a short audio sample in
 * the request body, writes only to an OS temp directory, and never creates a
 * Track or an import manifest. The caller must show the external-request and
 * possible-cost disclosure before invoking this route.
 */
/**
 * The implementation is kept behind an injectable seam so the privacy
 * contract can be tested with a fake provider without sending an audio sample
 * to a real service. The public route always uses the production factory.
 */
export async function runProviderConnectivityTest(
  req: NextRequest,
  providerFactory: ProviderConnectivityFactory = getTranscriptionProviderFor,
  providerCredentialReader: ProviderCredentialReader = withProviderCredential,
  providerStatusWriter: typeof setProviderVerificationStatus = setProviderVerificationStatus,
) {
  const provider = req.headers.get("x-deeplistener-provider")?.toLowerCase();
  const encodedName = req.headers.get("x-deeplistener-file-name");
  const size = Number(req.headers.get("x-deeplistener-file-size"));
  if (!provider || !encodedName || !req.body || !Number.isSafeInteger(size) || size <= 0) {
    return NextResponse.json({ error: "Choose a provider and a non-empty audio sample first." }, { status: 400 });
  }
  if (!PROVIDER_IDS.includes(provider as ProviderId)) {
    return NextResponse.json({ error: "Choose a supported transcription provider." }, { status: 400 });
  }
  let name: string;
  try {
    name = decodeURIComponent(encodedName);
  } catch {
    return NextResponse.json({ error: "Invalid audio sample name." }, { status: 400 });
  }
  const metadata = { name, type: req.headers.get("content-type") ?? undefined, size };
  const validation = validateUploadFileMetadata(metadata);
  if (!validation.ok || getUploadMediaKind(metadata) !== "AUDIO") {
    return NextResponse.json({ error: validation.error ?? "Provider tests accept audio files only." }, { status: 400 });
  }

  const usesCredentialBoundary = providerFactory === getTranscriptionProviderFor || providerFactory.credentialScope === true;

  const root = await mkdtemp(path.join(tmpdir(), "deeplistener-provider-test-"));
  const filePath = path.join(root, sanitizeUploadFilename(name));
  try {
    await mkdir(root, { recursive: true });
    const written = await writeBody(req.body, filePath, Math.min(MAX_AUDIO_UPLOAD_BYTES, 50 * 1024 * 1024));
    if (written !== size) {
      return NextResponse.json({ error: "The audio sample size did not match its declared size." }, { status: 400 });
    }
    const selectedProvider = provider as ProviderId;
    const transcribe = async (credential?: string) => {
      const config: TranscriptionProviderConfig | undefined = credential
        ? {
            apiKey: credential,
            ...(selectedProvider === "openai" && process.env.OPENAI_BASE_URL
              ? { baseUrl: process.env.OPENAI_BASE_URL }
              : {}),
          }
        : undefined;
      const providerClient = providerFactory(selectedProvider, config);
      return withTimeout(providerClient.transcribe(filePath));
    };
    const response = usesCredentialBoundary
      ? await providerCredentialReader(selectedProvider, (credential) => transcribe(credential))
      : await transcribe();
    if (!response.segments.length) {
      throw new Error("The provider returned an empty transcript.");
    }
    if (usesCredentialBoundary) {
      await providerStatusWriter(selectedProvider, "verified").catch(() => undefined);
    }
    return NextResponse.json({ ok: true, provider, sentenceCount: response.segments.length });
  } catch (error) {
    const safe = toPublicUploadError(error);
    if (usesCredentialBoundary) {
      await providerStatusWriter(
        provider as ProviderId,
        safe.code === "PROVIDER_NOT_CONFIGURED" ? "invalid" : "unknown",
      ).catch(() => undefined);
    }
    // Never log provider SDK errors: they may contain request metadata,
    // private paths, or credential-bearing diagnostics. The response is
    // already reduced to a curated public message/code below.
    console.error("Provider connectivity test failed:", safe.code ?? "UNKNOWN");
    return NextResponse.json({ error: safe.message, ...(safe.code ? { code: safe.code } : {}) }, { status: safe.status });
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function POST(req: NextRequest) {
  return runProviderConnectivityTest(req);
}

async function writeBody(body: ReadableStream<Uint8Array>, target: string, maxBytes: number): Promise<number> {
  let written = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      written += chunk.length;
      if (written > maxBytes) return callback(new Error("File exceeded the allowed size while uploading"));
      callback(null, chunk);
    },
  });
  await pipeline(
    Readable.fromWeb(body as unknown as NodeReadableStream<Uint8Array>),
    limiter,
    createWriteStream(target, { flags: "wx" }),
  );
  return written;
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Provider connectivity test timed out.")), PROVIDER_TEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
