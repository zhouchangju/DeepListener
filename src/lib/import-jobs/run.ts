import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProviderSummary, withProviderCredential, PROVIDER_IDS, type ProviderId } from "@/lib/secrets-store";
import { getTranscriptionProviderFor } from "@/lib/transcription/factory";
import type { TranscriptionProvider, TranscriptionProviderConfig, TranscriptionResponse } from "@/lib/transcription/types";
import { extractAudioFromVideo, readEmbeddedSubtitles } from "@/lib/media-processing";
import { parseSubtitle, validateSubtitleMatch } from "@/lib/subtitle-utils";
import { toPublicUploadError } from "@/lib/upload-error";
import { resolveLayout, type RuntimeLayout } from "@/lib/runtime-paths";
import {
  importJobDirectory,
  importJobStagingDirectory,
  readManifest,
  resolveArtifactPath,
  writeManifest,
} from "./manifest";
import { promoteArtifact, promoteDerivedAudio } from "./staging";
import type { ImportArtifact, ImportJobErrorCode, ImportJobManifest, PublicImportJob } from "./types";
import { toPublicImportJob } from "./manifest";
import { beginTranscriptionAttempt, finishTranscriptionAttempt, ownsTranscriptionAttempt } from "./transcription-attempt";

const TRANSCRIPTION_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_LOCK_MS = 30 * 60 * 1000;

/** Injectable seam for deterministic provider failure-injection tests. */
export type TranscriptionProviderFactory = ((provider: string, config?: TranscriptionProviderConfig) => TranscriptionProvider) & {
  /** Mark an injected factory as safe to receive operation-scoped credentials. */
  credentialScope?: boolean;
};
export type ProviderCredentialReader = <T>(provider: ProviderId, operation: (credential: string) => Promise<T> | T) => Promise<T>;

/** Minimal database surface used by activation; injectable for disposable E2E tests. */
export type ImportJobDatabase = Pick<PrismaClient, "track">;

/** Run one operation through subtitle selection, transcription, and activation. */
export async function runImportJob(
  operationId: string,
  providerOverride?: string,
  layout: RuntimeLayout = resolveLayout(),
  database: ImportJobDatabase = prisma,
  providerFactory: TranscriptionProviderFactory = getTranscriptionProviderFor,
  transcriptionTimeoutMs = TRANSCRIPTION_TIMEOUT_MS,
  lockStaleAfterMs = STALE_LOCK_MS,
  providerCredentialReader: ProviderCredentialReader = withProviderCredential,
): Promise<PublicImportJob> {
  const manifest = await readManifest(operationId, layout);
  if (!manifest) throw new ImportJobError("IMPORT_FAILED", "Import operation was not found.");
  if (manifest.status === "ACTIVATED" || manifest.status === "CANCELED") return toPublicImportJob(manifest);

  const lockDir = path.join(importJobDirectory(operationId, layout), ".lock");
  const executeWithCurrentManifest = async (): Promise<PublicImportJob> => {
    const current = await readManifest(operationId, layout);
    if (!current) throw new ImportJobError("IMPORT_FAILED", "Import operation was not found.");
    if (current.status === "ACTIVATED" || current.status === "CANCELED") return toPublicImportJob(current);
    return runLocked(
      current,
      providerOverride,
      layout,
      database,
      providerFactory,
      transcriptionTimeoutMs,
      providerCredentialReader,
    );
  };
  try {
    await mkdir(lockDir);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      try {
        const lock = await stat(lockDir);
        // A killed process cannot execute the finally block. Treat only a
        // clearly stale lock as abandoned; a live operation remains fenced.
        if (Date.now() - lock.mtimeMs > lockStaleAfterMs) {
          await rm(lockDir, { recursive: true, force: true });
          await mkdir(lockDir);
          return await executeWithCurrentManifest().finally(() => rm(lockDir, { recursive: true, force: true }).catch(() => undefined));
        }
      } catch {
        // Fall through to the safe conflict response below.
      }
      throw new ImportJobError("IMPORT_FAILED", "This import is already being processed.");
    }
    throw error;
  }

  try {
    return await executeWithCurrentManifest();
  } finally {
    await rm(lockDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function runLocked(
  initial: ImportJobManifest,
  providerOverride: string | undefined,
  layout: RuntimeLayout,
  database: ImportJobDatabase,
  providerFactory: TranscriptionProviderFactory,
  transcriptionTimeoutMs: number,
  providerCredentialReader: ProviderCredentialReader,
): Promise<PublicImportJob> {
  let manifest = initial;
  const sourceArtifact = manifest.artifacts.find((artifact) => artifact.kind === "source");
  if (!sourceArtifact) return fail(manifest, new ImportJobError("IMPORT_FAILED", "The staged media file is missing."), layout);
  const sourcePath = resolveArtifactPath(manifest, sourceArtifact, layout);
  try {
    await stat(sourcePath);
  } catch {
    return fail(manifest, new ImportJobError("IMPORT_FAILED", "The staged media file is missing."), layout);
  }

  const provider = (providerOverride ?? manifest.provider ?? getProviderSummary().provider).toLowerCase();
  if (!PROVIDER_IDS.includes(provider as ProviderId)) {
    return fail(manifest, new ImportJobError("IMPORT_FAILED", "Unsupported transcription provider."), layout);
  }
  const attempt = beginTranscriptionAttempt(provider as ProviderId);
  manifest = await writeManifest({
    ...manifest,
    status: "TRANSCRIBING",
    phase: "transcribing",
    provider: provider as ProviderId,
    attempt,
    error: undefined,
  }, layout);

  try {
    const transcription = await chooseTranscription(
      manifest,
      sourcePath,
      provider,
      layout,
      providerFactory,
      transcriptionTimeoutMs,
      providerCredentialReader,
    );
    const latest = await readManifest(manifest.id, layout);
    if (latest?.status === "CANCELED" || latest?.status === "ACTIVATED") return toPublicImportJob(latest);
    const current = latest ?? manifest;
    if (!ownsTranscriptionAttempt(current, attempt.id)) {
      throw new ImportJobError("IMPORT_FAILED", "This transcription result is no longer current.");
    }
    const completed = await writeManifest(
      finishTranscriptionAttempt(current, attempt.id, "SUCCEEDED"),
      layout,
    );
    const activated = await activate(completed, sourceArtifact, transcription, layout, database);
    if (activated.status === "ACTIVATED") {
      await rm(importJobStagingDirectory(manifest.id, layout), { recursive: true, force: true }).catch(() => undefined);
    }
    return toPublicImportJob(activated);
  } catch (error: unknown) {
    const classified = classifyImportError(error);
    const latest = await readManifest(manifest.id, layout);
    if (latest?.status === "CANCELED" || latest?.status === "ACTIVATED") return toPublicImportJob(latest);
    const current = latest ?? manifest;
    const failedAttempt = finishTranscriptionAttempt(
      current,
      attempt.id,
      classified.code === "TRANSCRIPTION_TIMEOUT" ? "TIMED_OUT" : "FAILED",
    );
    return fail(failedAttempt, classified, layout);
  }
}

async function chooseTranscription(
  manifest: ImportJobManifest,
  sourcePath: string,
  provider: string,
  layout: RuntimeLayout,
  providerFactory: TranscriptionProviderFactory,
  transcriptionTimeoutMs: number,
  providerCredentialReader: ProviderCredentialReader,
): Promise<TranscriptionResponse> {
  let audioPath = sourcePath;
  if (manifest.mediaKind === "VIDEO") {
    const derivedKey = "derived-audio/audio.mp3";
    const derivedArtifact: ImportArtifact = { kind: "derived-audio", storageKey: derivedKey, originalName: `${manifest.displayName}.mp3` };
    const existing = manifest.artifacts.find((artifact) => artifact.kind === "derived-audio");
    const chosen = existing ?? derivedArtifact;
    audioPath = resolveArtifactPath(manifest, chosen, layout);
    await mkdir(path.dirname(audioPath), { recursive: true });
    await extractAudioFromVideo(sourcePath, audioPath);
    const info = await stat(audioPath);
    if (!existing) {
      await writeManifest({ ...manifest, artifacts: [...manifest.artifacts, { ...chosen, bytes: info.size }] }, layout);
    }
  }

  const subtitleArtifact = manifest.artifacts.find((artifact) => artifact.kind === "subtitle");
  if (subtitleArtifact) {
    const subtitlePath = resolveArtifactPath(manifest, subtitleArtifact, layout);
    const source = await readFile(subtitlePath, "utf8");
    const format = manifest.subtitleFormat ?? (path.extname(subtitleArtifact.originalName ?? subtitleArtifact.storageKey).toLowerCase() === ".vtt" ? "vtt" : "srt");
    const segments = parseSubtitle(source, format);
    const match = validateSubtitleMatch(segments);
    if (!match.ok) throw new ImportJobError(match.reason === "outside-media" ? "SUBTITLE_MISMATCH" : "SUBTITLE_INVALID", "The subtitle timings do not match this media file.");
    return {
      fullText: segments.map((segment) => segment.text).join(" "),
      segments,
      rawJson: JSON.stringify({ source: "sidecar-subtitles", format, segments }),
    };
  }

  if (manifest.mediaKind === "VIDEO") {
    const embedded = await readEmbeddedSubtitles(sourcePath);
    if (embedded) return embedded;
  }

  // Production providers receive only the selected credential through the
  // operation-scoped service. Injected fake factories intentionally bypass
  // this boundary so failure-injection tests remain credential-free.
  if (providerFactory === getTranscriptionProviderFor || providerFactory.credentialScope === true) {
    return providerCredentialReader(provider as ProviderId, async (credential) => {
      const config: TranscriptionProviderConfig = {
        apiKey: credential,
        ...(provider === "openai" && process.env.OPENAI_BASE_URL
          ? { baseUrl: process.env.OPENAI_BASE_URL }
          : {}),
      };
      const transcriber = providerFactory(provider, config);
      return transcribeWithTimeout(transcriber, audioPath, transcriptionTimeoutMs);
    });
  }

  const transcriber = providerFactory(provider);
  return transcribeWithTimeout(transcriber, audioPath, transcriptionTimeoutMs);
}

async function activate(
  manifest: ImportJobManifest,
  sourceArtifact: ImportArtifact,
  transcription: TranscriptionResponse,
  layout: RuntimeLayout,
  database: ImportJobDatabase,
): Promise<ImportJobManifest> {
  if (!transcription.segments.length) throw new ImportJobError("TRANSCRIPTION_NO_SENTENCES", "The provider returned no usable transcript.");
  const current = await readManifest(manifest.id, layout);
  if (current?.trackId) return current;
  if (current?.status === "CANCELED") return current;
  const activating = await writeManifest({ ...manifest, status: "ACTIVATING", phase: "activating" }, layout);
  const promotedSource = await promoteArtifact(activating, sourceArtifact, layout);
  let audioUrl = promotedSource.url;
  let videoUrl: string | null = null;
  if (activating.mediaKind === "VIDEO") {
    videoUrl = promotedSource.url;
    const derived = activating.artifacts.find((artifact) => artifact.kind === "derived-audio");
    if (!derived) throw new ImportJobError("MEDIA_DECODE_FAILED", "Audio preparation failed.");
    const promotedAudio = await promoteDerivedAudio(activating, derived, layout);
    audioUrl = promotedAudio.url;
  }
  const title = activating.title ?? activating.displayName;
  const data = {
    id: activating.id,
    title,
    audioUrl,
    mediaType: activating.mediaKind,
    videoUrl,
    transcription: transcription.rawJson,
    status: "UNLEARNT",
    sentences: {
      create: transcription.segments.map((segment, index) => ({
        text: segment.text,
        startTime: segment.start,
        endTime: segment.end,
        orderIndex: index,
      })),
    },
  } as const;
  let track;
  try {
    track = await database.track.create({ data, include: { sentences: true } });
  } catch (error: unknown) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    track = await database.track.findUnique({ where: { id: activating.id }, include: { sentences: true } });
    if (!track) throw error;
  }
  return await writeManifest({
    ...activating,
    status: "ACTIVATED",
    phase: "complete",
    trackId: track.id,
    title: track.title,
    error: undefined,
  }, layout);
}

async function transcribeWithTimeout(
  provider: TranscriptionProvider,
  audioPath: string,
  timeoutMs: number,
): Promise<TranscriptionResponse> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ImportJobError("TRANSCRIPTION_TIMEOUT", "Transcription timed out. You can retry this import or choose another provider.")),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([provider.transcribe(audioPath), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function classifyImportError(error: unknown): ImportJobError {
  if (error instanceof ImportJobError) return error;
  const safe = toPublicUploadError(error);
  const code = toImportJobErrorCode(safe.code);
  return new ImportJobError(code, safe.message);
}

function toImportJobErrorCode(code: string | undefined): ImportJobErrorCode {
  switch (code) {
    case "PROVIDER_NOT_CONFIGURED":
    case "PROVIDER_REQUEST_FAILED":
    case "TRANSCRIPTION_TIMEOUT":
    case "TRANSCRIPTION_NO_SENTENCES":
    case "FFMPEG_NOT_FOUND":
    case "DISK_INSUFFICIENT":
      return code;
    case "FFMPEG_FAILED":
    case "MEDIA_DECODE_FAILED":
      return "MEDIA_DECODE_FAILED";
    case "TRANSCRIPTION_FAILED":
      return "PROVIDER_REQUEST_FAILED";
    default:
      return "IMPORT_FAILED";
  }
}

async function fail(manifest: ImportJobManifest, error: ImportJobError, layout: RuntimeLayout): Promise<PublicImportJob> {
  const failed = await writeManifest({
    ...manifest,
    status: "FAILED",
    phase: "failed",
    error: { code: error.code, message: error.message, occurredAt: new Date().toISOString() },
  }, layout);
  return toPublicImportJob(failed);
}

export class ImportJobError extends Error {
  readonly code: ImportJobErrorCode;

  constructor(code: ImportJobErrorCode, message: string) {
    super(message);
    this.name = "ImportJobError";
    this.code = code;
  }
}
