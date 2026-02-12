import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { formatting, text } = await req.json();

    const data: { formatting?: string | null; text?: string } = {};
    
    if (formatting !== undefined) {
        if (typeof formatting !== "string" && formatting !== null) {
            return NextResponse.json({ error: "formatting must be a string or null" }, { status: 400 });
        }
        data.formatting = formatting;
    }

    if (text !== undefined) {
        if (typeof text !== "string" || !text.trim()) {
            return NextResponse.json({ error: "text must be a non-empty string" }, { status: 400 });
        }
        data.text = text;
    }

    const sentence = await prisma.sentence.update({
      where: { id },
      data,
    });

    return NextResponse.json(sentence);
  } catch (error: unknown) {
    console.error("Sentence update error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
