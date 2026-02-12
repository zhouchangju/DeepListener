import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getTranscriptionProvider } from "@/lib/transcription/factory";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${uuidv4()}-${file.name}`;
    const uploadPath = path.join(process.cwd(), "public/uploads", fileName);
    const audioUrl = `/uploads/${fileName}`;

    await writeFile(uploadPath, buffer);

    // 使用工厂获取当前选定的 Transcription Provider
    const provider = getTranscriptionProvider();

    console.log(`Starting transcription using ${process.env.TRANSCRIPTION_PROVIDER || "openai"}...`);
    const transcription = await provider.transcribe(uploadPath);
    console.log("Transcription complete.");

    // Create Track and Sentences
    const track = await prisma.track.create({
      data: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        audioUrl: audioUrl,
        transcription: transcription.rawJson,
        status: "UNLEARNT",
        sentences: {
          create: transcription.segments.map((segment, index: number) => ({
            text: segment.text,
            startTime: segment.start,
            endTime: segment.end,
            orderIndex: index,
          })),
        },
      },
      include: {
        sentences: true,
      },
    });

    return NextResponse.json(track);
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Batch upload endpoint
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const provider = getTranscriptionProvider();
    const results = {
      success: [] as Array<{ id: string; title: string; audioUrl: string }>,
      failed: [] as Array<{ fileName: string; error: string }>,
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${uuidv4()}-${file.name}`;
      const uploadPath = path.join(process.cwd(), "public/uploads", fileName);
      const audioUrl = `/uploads/${fileName}`;

      try {
        // Save file
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(uploadPath, buffer);

        // Transcribe
        console.log(`[${i + 1}/${files.length}] Starting transcription: ${file.name}`);
        const transcription = await provider.transcribe(uploadPath);
        console.log(`[${i + 1}/${files.length}] Transcription complete: ${file.name}`);

        // Create Track and Sentences
        const track = await prisma.track.create({
          data: {
            title: file.name.replace(/\.[^/.]+$/, ""),
            audioUrl: audioUrl,
            transcription: transcription.rawJson,
            status: "UNLEARNT",
            sentences: {
              create: transcription.segments.map((segment, index: number) => ({
                text: segment.text,
                startTime: segment.start,
                endTime: segment.end,
                orderIndex: index,
              })),
            },
          },
        });

        results.success.push({
          id: track.id,
          title: track.title,
          audioUrl: track.audioUrl,
        });
      } catch (error: unknown) {
        console.error(`[${i + 1}/${files.length}] Failed to process ${file.name}:`, error);
        const message = error instanceof Error ? error.message : "Unknown error";
        results.failed.push({
          fileName: file.name,
          error: message,
        });
      }
    }

    console.log(`Batch upload complete: ${results.success.length} succeeded, ${results.failed.length} failed`);

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error("Batch upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}