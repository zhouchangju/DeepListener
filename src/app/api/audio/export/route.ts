import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';
import { badRequest, internalServerError } from '@/lib/api-response';
import { audioExportSchema, formatZodError } from '@/lib/api-schemas';
import { resolveStoredUploadPath } from '@/lib/upload-policy';

export const maxDuration = 300; // 5 minutes
export const maxSegments = 500; // Maximum segments to export

interface AudioSegment {
  audioPath: string;
  startTime: number;
  endTime: number;
}

interface AudioFilterSpec {
  filter: string;
  options: string;
}

interface FilteredReviewItemsWhereOptions {
  difficulties?: string[];
  trackIds?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export function buildFilteredReviewItemsWhere({
  difficulties,
  trackIds,
  dateFrom,
  dateTo,
}: FilteredReviewItemsWhereOptions): Prisma.ReviewItemWhereInput {
  const where: Prisma.ReviewItemWhereInput = {
    isArchived: false,
  };

  if (difficulties && difficulties.length > 0) {
    where.difficulty = { in: difficulties };
  }

  if (trackIds && trackIds.length > 0) {
    where.sentence = { trackId: { in: trackIds } };
  }

  if (dateFrom || dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};

    if (dateFrom) {
      createdAt.gte = new Date(dateFrom);
    }

    if (dateTo) {
      const inclusiveDateTo = new Date(dateTo);
      inclusiveDateTo.setHours(23, 59, 59, 999);
      createdAt.lte = inclusiveDateTo;
    }

    where.createdAt = createdAt;
  }

  return where;
}

export function buildDueReviewItemsWhere(now: Date = new Date()): Prisma.ReviewItemWhereInput {
  return {
    due: {
      lte: now,
    },
    isArchived: false,
  };
}

export function getSegmentExportAudioFilters(): AudioFilterSpec[] {
  return [
    {
      filter: 'aresample',
      options: '44100',
    },
  ];
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
): Promise<AudioSegment[]> {
  let reviewItems;

  switch (type) {
    case 'all':
      reviewItems = await prisma.reviewItem.findMany({
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
      });
      break;

    case 'due':
      reviewItems = await prisma.reviewItem.findMany({
        where: buildDueReviewItemsWhere(),
        include: {
          sentence: {
            include: { track: true },
          },
        },
        orderBy: {
          due: 'asc',
        },
      });
      break;

    case 'track':
      if (!trackId) {
        throw new Error('trackId is required for track export');
      }
      reviewItems = await prisma.reviewItem.findMany({
        where: {
          sentence: {
            trackId,
          },
          isArchived: false,
        },
        include: {
          sentence: {
            include: { track: true },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      break;

    case 'filtered':
      reviewItems = await prisma.reviewItem.findMany({
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
      });
      break;

    default:
      throw new Error(`Invalid export type: ${type}`);
  }

  if (reviewItems.length === 0) {
    return [];
  }

  // Group by track and sort by sentence orderIndex
  const trackMap = new Map<string, typeof reviewItems>();

  for (const item of reviewItems) {
    const trackId = item.sentence.trackId;
    if (!trackMap.has(trackId)) {
      trackMap.set(trackId, []);
    }
    trackMap.get(trackId)!.push(item);
  }

  // Sort within each track by orderIndex
  for (const items of trackMap.values()) {
    items.sort((a, b) => a.sentence.orderIndex - b.sentence.orderIndex);
  }

  // Convert to segments
  const segments: AudioSegment[] = [];
  for (const items of trackMap.values()) {
    for (const item of items) {
      // Validate audioUrl to prevent path traversal
      const audioUrl = item.sentence.track.audioUrl;
      const audioPath = resolveStoredUploadPath(audioUrl);
      if (!audioPath) {
        console.warn(`Invalid audioUrl detected: ${audioUrl}`);
        continue;
      }

      if (!fs.existsSync(audioPath)) {
        console.warn(`Audio file not found: ${audioPath}`);
        continue;
      }

      segments.push({
        audioPath,
        startTime: item.sentence.startTime,
        endTime: item.sentence.endTime,
      });
    }
  }

  return segments;
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
    const segments = await gatherSegments(type, trackId, difficulties, trackIds, dateFrom, dateTo);

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

        return new Promise<void>((resolve, reject) => {
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
        });
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
                new Promise<void>((resolve, reject) => {
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
                })
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
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .audioBitrate('192k')
        .on('error', reject)
        .on('end', () => resolve())
        .save(outputFile);
    });

    // Read final output file (use readFile instead of readSync to avoid blocking)
    const finalBuffer = await fs.promises.readFile(outputFile);

    // Cleanup temp directory
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const filename = type === 'filtered'
      ? `DeepListener_Filtered_${new Date().toISOString().split('T')[0]}.mp3`
      : generateFilename();

    return new Response(finalBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Audio export error:', error);

    // Cleanup temp directory on error
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to cleanup temp directory:', e);
      }
    }

    return internalServerError();
  }
}
