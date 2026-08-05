import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import { Readable } from 'stream';
import { badRequest, internalServerErrorFrom } from '@/lib/api-response';
import { audioExportSchema, formatZodError } from '@/lib/api-schemas';
import { formatIncompleteExportMessage, resolveExportSource, type ExportSourceIssue } from '@/lib/export-file-policy';
import { withFfmpegLimit } from '@/lib/ffmpeg-limiter';
import { buildDueReviewItemsWhere, buildFilteredReviewItemsWhere, getSegmentExportAudioFilters } from './query';

export const maxDuration = 300; // 5 minutes
const maxSegments = 500; // Maximum segments to export

interface AudioSegment {
  audioPath: string;
  startTime: number;
  endTime: number;
}

interface GatherSegmentsResult {
  segments: AudioSegment[];
  issues: ExportSourceIssue[];
  totalItems: number;
}

interface ExportSentence {
  trackId: string;
  orderIndex: number;
  startTime: number;
  endTime: number;
  track: {
    title: string;
    audioUrl: string;
  };
}

function generateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `DeepListener_Export_${date}.mp3`;
}

async function gatherSegments(
  type: 'all' | 'due' | 'track' | 'filtered',
  trackId?: string,
  difficulties?: string[],
  trackIds?: string[],
  dateFrom?: string,
  dateTo?: string
): Promise<GatherSegmentsResult> {
  let sentences: ExportSentence[] = [];

  switch (type) {
    case 'all':
      sentences = (await prisma.reviewItem.findMany({
        where: {
          isArchived: false,
        },
        include: {
          sentence: {
            include: { track: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })).map((item) => item.sentence);
      break;

    case 'due':
      sentences = (await prisma.reviewItem.findMany({
        where: buildDueReviewItemsWhere(),
        include: {
          sentence: {
            include: { track: true },
          },
        },
        orderBy: {
          due: 'asc',
        },
      })).map((item) => item.sentence);
      break;

    case 'track':
      if (!trackId) {
        throw new Error('trackId is required for track export');
      }
      {
        const track = await prisma.track.findUnique({
          where: { id: trackId },
          include: {
            sentences: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        });

        if (!track) {
          return { segments: [], issues: [], totalItems: 0 };
        }

        sentences = track.sentences.map((sentence) => ({
          trackId: track.id,
          orderIndex: sentence.orderIndex,
          startTime: sentence.startTime,
          endTime: sentence.endTime,
          track: {
            title: track.title,
            audioUrl: track.audioUrl,
          },
        }));
      }
      break;

    case 'filtered':
      sentences = (await prisma.reviewItem.findMany({
        where: buildFilteredReviewItemsWhere({
          difficulties,
          trackIds,
          dateFrom,
          dateTo,
        }),
        include: {
          sentence: {
            include: { track: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      })).map((item) => item.sentence);
      break;

    default:
      throw new Error(`Invalid export type: ${type}`);
  }

  if (sentences.length === 0) {
    return { segments: [], issues: [], totalItems: 0 };
  }

  // Group by track and sort by sentence orderIndex
  const trackMap = new Map<string, ExportSentence[]>();

  for (const sentence of sentences) {
    const trackId = sentence.trackId;
    if (!trackMap.has(trackId)) {
      trackMap.set(trackId, []);
    }
    trackMap.get(trackId)!.push(sentence);
  }

  // Sort within each track by orderIndex
  for (const items of trackMap.values()) {
    items.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // Convert to segments
  const segments: AudioSegment[] = [];
  const issuesBySource = new Map<string, ExportSourceIssue>();
  for (const items of trackMap.values()) {
    for (const sentence of items) {
      const result = resolveExportSource({
        label: sentence.track.title,
        audioUrl: sentence.track.audioUrl,
      });

      if ("issue" in result) {
        issuesBySource.set(`${result.issue.reason}:${result.issue.audioUrl}`, result.issue);
        continue;
      }

      segments.push({
        audioPath: result.audioPath,
        startTime: sentence.startTime,
        endTime: sentence.endTime,
      });
    }
  }

  return {
    segments,
    issues: [...issuesBySource.values()],
    totalItems: sentences.length,
  };
}

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;

  try {
    const parsed = audioExportSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const exportRequest = parsed.data;
    const type = exportRequest.type;
    const trackId = exportRequest.type === 'track' ? exportRequest.trackId : undefined;
    const difficulties = exportRequest.type === 'filtered' ? exportRequest.difficulties : undefined;
    const trackIds = exportRequest.type === 'filtered' ? exportRequest.trackIds : undefined;
    const dateFrom = exportRequest.type === 'filtered' ? exportRequest.dateFrom : undefined;
    const dateTo = exportRequest.type === 'filtered' ? exportRequest.dateTo : undefined;

    // Gather segments
    const { segments, issues, totalItems } = await gatherSegments(type, trackId, difficulties, trackIds, dateFrom, dateTo);

    // Only fail when EVERY segment has a problem; otherwise export the valid
    // segments and log the issues. This matches library export behavior so a
    // single broken audio file can't block exporting the rest.
    if (issues.length > 0 && segments.length === 0) {
      return badRequest(formatIncompleteExportMessage('sentences', totalItems, issues));
    }
    if (issues.length > 0) {
      console.warn('Audio export skipped segments with issues:', issues);
    }

    if (segments.length === 0) {
      return badRequest('No sentences to export');
    }

    if (segments.length > maxSegments) {
      return badRequest(`Too many sentences to export (${segments.length}). Maximum ${maxSegments} sentences.`);
    }

    // Create temporary directory for intermediate files
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'deeplistener-export-'));

    // Extract each segment to a temporary file (process in batches to limit memory)
    const segmentFiles: string[] = [];
    const batchSize = 50;

    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, Math.min(i + batchSize, segments.length));
      const batchPromises = batch.map((seg, batchIndex) => {
        const globalIndex = i + batchIndex;
        const duration = seg.endTime - seg.startTime;
        const outputFile = path.join(tempDir!, `segment_${globalIndex}.mp3`);

        return withFfmpegLimit(() => new Promise<void>((resolve, reject) => {
          ffmpeg(seg.audioPath)
            .setStartTime(seg.startTime)
            .setDuration(duration)
            .audioFilters(getSegmentExportAudioFilters())
            .audioBitrate('192k')
            .on('error', reject)
            .on('end', () => {
              segmentFiles[globalIndex] = outputFile;
              resolve();
            })
            .save(outputFile);
        }));
      });

      await Promise.all(batchPromises);

      if (global.gc) {
        global.gc();
      }
    }

    // Create concat list file with silence between segments
    const concatFilePath = path.join(tempDir!, 'concat.txt');
    const concatEntries: string[] = [];

    // Generate silence files in batches
    const silenceBatchSize = 50;
    for (let i = 0; i < segmentFiles.length; i++) {
      concatEntries.push(`file '${segmentFiles[i]}'`);

      if (i < segmentFiles.length - 1) {
        const silenceFile = path.join(tempDir!, `silence_${i}.mp3`);
        concatEntries.push(`file '${silenceFile}'`);

        // Process silence generation in batches
        if ((i + 1) % silenceBatchSize === 0 || i === segmentFiles.length - 2) {
          const silencePromises = [];
          const startSilence = Math.max(0, i - silenceBatchSize + 1);

          for (let j = startSilence; j <= i; j++) {
            if (j < segmentFiles.length - 1) {
              const currentSilenceFile = path.join(tempDir!, `silence_${j}.mp3`);
              silencePromises.push(
                withFfmpegLimit(() => new Promise<void>((resolve, reject) => {
                  ffmpeg(segmentFiles[0]!)
                    .audioFilters([
                      {
                        filter: 'volume',
                        options: '0',
                      },
                      {
                        filter: 'aresample',
                        options: '44100',
                      },
                    ])
                    .setDuration(2.0)
                    .audioBitrate('192k')
                    .on('error', reject)
                    .on('end', () => resolve())
                    .save(currentSilenceFile);
                }))
              );
            }
          }

          await Promise.all(silencePromises);

          if (global.gc) {
            global.gc();
          }
        }
      }
    }

    // Write concat list
    fs.writeFileSync(concatFilePath, concatEntries.join('\n'));

    // Merge all files using concat demuxer
    const outputFile = path.join(tempDir!, 'output.mp3');
    await withFfmpegLimit(() => new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .audioBitrate('192k')
        .on('error', reject)
        .on('end', () => resolve())
        .save(outputFile);
    }));

    // Stream the final output instead of buffering it whole. A 500-segment
    // export can be tens of MB; reading it into a single Buffer risks OOM
    // under concurrent exports.
    const stat = await fs.promises.stat(outputFile);
    const filename = type === 'filtered'
      ? `DeepListener_Filtered_${new Date().toISOString().split('T')[0]}.mp3`
      : generateFilename();

    // Hold the temp dir until the stream finishes draining, then clean up.
    const fileStream = createReadStream(outputFile);
    const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;
    const tempDirRef = tempDir;
    tempDir = null; // transferred ownership to the stream cleanup below
    fileStream.on('close', () => {
      if (tempDirRef) {
        try {
          fs.rmSync(tempDirRef, { recursive: true, force: true });
        } catch (e) {
          console.error('Failed to cleanup temp directory:', e);
        }
      }
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    // Cleanup temp directory on error
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to cleanup temp directory:', e);
      }
    }

    return internalServerErrorFrom(error, 'FFMPEG_FAILED');
  }
}
