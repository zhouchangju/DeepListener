import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';

export const maxDuration = 300; // 5 minutes
export const maxSegments = 500; // Maximum segments to export

interface AudioSegment {
  audioPath: string;
  startTime: number;
  endTime: number;
}

function generateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `DeepListener_Export_${date}.mp3`;
}

async function gatherSegments(
  type: 'all' | 'due' | 'track' | 'filtered',
  trackId?: string,
  difficulties?: string[],
  trackIds?: string[]
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
        where: {
          nextReview: {
            lte: new Date(),
          },
          isArchived: false,
        },
        include: {
          sentence: {
            include: { track: true },
          },
        },
        orderBy: {
          nextReview: 'asc',
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
        where: {
          isArchived: false,
          ...(difficulties && difficulties.length > 0 && { difficulty: { in: difficulties } }),
          ...(trackIds && trackIds.length > 0 && { sentence: { trackId: { in: trackIds } } }),
        },
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
      
      // Check for path traversal attempts
      if (audioUrl.includes('..') || audioUrl.includes('\\') || audioUrl.startsWith('/')) {
        console.warn(`Invalid audioUrl detected (potential path traversal): ${audioUrl}`);
        continue;
      }
      
      const audioPath = path.join(
        process.cwd(),
        'public',
        audioUrl
      );

      // Ensure the resolved path is within the public directory
      const publicDir = path.join(process.cwd(), 'public');
      const resolvedPath = path.resolve(audioPath);
      if (!resolvedPath.startsWith(publicDir)) {
        console.warn(`Audio path escapes public directory: ${resolvedPath}`);
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
    const body = await req.json();
    const { type, trackId, difficulties, trackIds }: {
      type: 'all' | 'due' | 'track' | 'filtered';
      trackId?: string;
      difficulties?: string[];
      trackIds?: string[];
    } = body;

    // Validate input
    if (type !== 'all' && type !== 'due' && type !== 'track' && type !== 'filtered') {
      return new Response(
        JSON.stringify({ error: 'Invalid export type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'track' && !trackId) {
      return new Response(
        JSON.stringify({ error: 'trackId is required for track export' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gather segments
    const segments = await gatherSegments(type, trackId, difficulties, trackIds);

    if (segments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No sentences to export' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (segments.length > 500) {
      return new Response(
        JSON.stringify({ error: `Too many sentences to export (${segments.length}). Maximum 500 sentences.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
