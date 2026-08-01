import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import { Readable } from 'stream';
import { badRequest, internalServerError } from '@/lib/api-response';
import { formatZodError, libraryExportSchema } from '@/lib/api-schemas';
import { formatIncompleteExportMessage, resolveExportSource, type ExportSourceIssue } from '@/lib/export-file-policy';
import { withFfmpegLimit } from '@/lib/ffmpeg-limiter';
import { toSafeHeaderFilename } from '@/lib/header-filename';
import { buildFilteredTracksWhere } from './query';

export const maxDuration = 300; // 5 minutes

interface AudioTrack {
  audioPath: string;
  title: string;
}

interface GatherTracksResult {
  tracks: AudioTrack[];
  issues: ExportSourceIssue[];
  totalItems: number;
}

async function gatherTracks(
  where: Prisma.TrackWhereInput
): Promise<GatherTracksResult> {
  const tracks = await prisma.track.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  if (tracks.length === 0) {
    return { tracks: [], issues: [], totalItems: 0 };
  }

  const audioTracks: AudioTrack[] = [];
  const issuesBySource = new Map<string, ExportSourceIssue>();
  for (const track of tracks) {
    const result = resolveExportSource({
      label: track.title,
      audioUrl: track.audioUrl,
    });

    if ("issue" in result) {
      issuesBySource.set(`${result.issue.reason}:${result.issue.audioUrl}`, result.issue);
      continue;
    }

    audioTracks.push({
      audioPath: result.audioPath,
      title: track.title,
    });
  }

  return {
    tracks: audioTracks,
    issues: [...issuesBySource.values()],
    totalItems: tracks.length,
  };
}

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;

  try {
    const parsed = libraryExportSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const { trackType, trackTopic, dateFrom, dateTo, isArchived, selectedTrackIds } = parsed.data;

    let where: Prisma.TrackWhereInput;
    if (selectedTrackIds && selectedTrackIds.length > 0) {
      where = { id: { in: selectedTrackIds } };
    } else {
      where = buildFilteredTracksWhere({
        trackType,
        trackTopic,
        dateFrom,
        dateTo,
        isArchived,
      });
    }

    const { tracks, issues, totalItems } = await gatherTracks(where);

    // Only fail when EVERY track has a problem. If even some tracks resolve,
    // export the valid ones and log the issues so a single stale/broken track
    // doesn't block exporting the rest of the library.
    if (issues.length > 0 && tracks.length === 0) {
      return badRequest(formatIncompleteExportMessage('tracks', totalItems, issues));
    }
    if (issues.length > 0) {
      console.warn('Library export skipped tracks with issues:', issues);
    }

    if (tracks.length === 0) {
      return badRequest('No tracks to export');
    }

    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'deeplistener-library-export-'));

    // Re-encode each track to a common format (MP3, 192k)
    const trackFiles: string[] = [];
    const batchSize = 10; // Process fewer tracks at once as they are larger than segments

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, Math.min(i + batchSize, tracks.length));
      const batchPromises = batch.map((track, batchIndex) => {
        const globalIndex = i + batchIndex;
        const outputFile = path.join(tempDir!, `track_${globalIndex}.mp3`);

        return withFfmpegLimit(() => new Promise<void>((resolve, reject) => {
          ffmpeg(track.audioPath)
            .audioBitrate('192k')
            .on('error', reject)
            .on('end', () => {
              trackFiles[globalIndex] = outputFile;
              resolve();
            })
            .save(outputFile);
        }));
      });

      await Promise.all(batchPromises);
    }

    // Create concat list file
    const concatFilePath = path.join(tempDir!, 'concat.txt');
    const concatEntries: string[] = [];

    for (let i = 0; i < trackFiles.length; i++) {
      concatEntries.push(`file '${trackFiles[i]}'`);

      if (i < trackFiles.length - 1) {
        const silenceFile = path.join(tempDir!, `silence_${i}.mp3`);
        
        // Generate 2 seconds of silence
        await withFfmpegLimit(() => new Promise<void>((resolve, reject) => {
          ffmpeg(trackFiles[0]!) // Use any source for metadata
            .audioFilters([
              { filter: 'volume', options: '0' },
              { filter: 'aresample', options: '44100' },
            ])
            .setDuration(2.0)
            .audioBitrate('192k')
            .on('error', reject)
            .on('end', () => resolve())
            .save(silenceFile);
        }));

        concatEntries.push(`file '${silenceFile}'`);
      }
    }

    fs.writeFileSync(concatFilePath, concatEntries.join('\n'));

    // Merge all files
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

    // Stream the merged output instead of buffering it whole (large exports
    // can OOM under concurrent requests).
    const stat = await fs.promises.stat(outputFile);

    let filename = 'DeepListener_Library_Export.mp3';
    if (trackType) {
        // Sanitize at the output boundary: trackType is free text that could
        // otherwise break the Content-Disposition header or inject extra headers.
        const safeType = toSafeHeaderFilename(trackType);
        filename = `DeepListener_${safeType}_Export.mp3`;
    }

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
    console.error('Library audio export error:', error);
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Cleanup failed:', e);
      }
    }
    return internalServerError();
  }
}
