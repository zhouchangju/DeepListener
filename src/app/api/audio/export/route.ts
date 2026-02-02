import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export const maxDuration = 300; // 5 minutes

interface AudioSegment {
  audioPath: string;
  startTime: number;
  endTime: number;
}

async function extractSegment(
  inputPath: string,
  startTime: number,
  duration: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .format('mp3')
      .audioBitrate('192k')
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      })
      .pipe()
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
  });
}

async function generateSilence(duration: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    ffmpeg()
      .input('anullsrc=r=44100:cl=mono')
      .inputOptions(['-f lavfi'])
      .duration(duration)
      .format('mp3')
      .audioBitrate('192k')
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      })
      .pipe()
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
  });
}

function generateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `DeepListener_Export_${date}.mp3`;
}

async function gatherSegments(
  type: 'all' | 'due' | 'track',
  trackId?: string
): Promise<AudioSegment[]> {
  let reviewItems;

  switch (type) {
    case 'all':
      reviewItems = await prisma.reviewItem.findMany({
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
      const audioPath = path.join(
        process.cwd(),
        'public',
        item.sentence.track.audioUrl
      );

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
  try {
    const body = await req.json();
    const { type, trackId }: { type: 'all' | 'due' | 'track'; trackId?: string } = body;

    // Validate input
    if (type !== 'all' && type !== 'due' && type !== 'track') {
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

    // Check memory
    if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
      if (global.gc) {
        global.gc();
      }

      if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'Server memory limit exceeded' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Gather segments
    const segments = await gatherSegments(type, trackId);

    if (segments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No sentences to export' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process audio segments
    const audioBuffers: Buffer[] = [];

    for (const segment of segments) {
      const duration = segment.endTime - segment.startTime;
      const audio = await extractSegment(
        segment.audioPath,
        segment.startTime,
        duration
      );
      audioBuffers.push(audio);

      const silence = await generateSilence(2.0);
      audioBuffers.push(silence);
    }

    const finalBuffer = Buffer.concat(audioBuffers);

    return new Response(finalBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${generateFilename()}"`,
      },
    });
  } catch (error) {
    console.error('Audio export error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
