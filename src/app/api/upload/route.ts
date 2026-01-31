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
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}