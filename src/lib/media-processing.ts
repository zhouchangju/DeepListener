import ffmpeg from "fluent-ffmpeg";
import { readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { parseSrt } from "./subtitle-utils";
import type { TranscriptionResponse } from "./transcription/types";

export function extractAudioFromVideo(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .on("error", reject)
      .on("end", () => resolve())
      .save(audioPath);
  });
}

function hasSubtitleStream(videoPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) return reject(error);
      resolve(metadata.streams.some((stream) => stream.codec_type === "subtitle"));
    });
  });
}

export async function readEmbeddedSubtitles(videoPath: string): Promise<TranscriptionResponse | null> {
  if (!(await hasSubtitleStream(videoPath))) return null;
  const subtitlePath = path.join(tmpdir(), `deeplistener-${uuidv4()}.srt`);
  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions(["-map 0:s:0", "-f srt"])
        .on("error", reject)
        .on("end", () => resolve())
        .save(subtitlePath);
    });
    const rawSrt = await readFile(subtitlePath, "utf8");
    const segments = parseSrt(rawSrt);
    if (segments.length === 0) return null;
    return {
      fullText: segments.map((segment) => segment.text).join(" "),
      segments,
      rawJson: JSON.stringify({ source: "embedded-subtitles", segments }),
    };
  } catch (error) {
    console.warn("Embedded subtitles could not be used; falling back to transcription.", error);
    return null;
  } finally {
    await rm(subtitlePath, { force: true });
  }
}
