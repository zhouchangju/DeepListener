import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { formatting } = await req.json();

    if (typeof formatting !== "string" && formatting !== null) {
      return NextResponse.json({ error: "formatting must be a string or null" }, { status: 400 });
    }

    const sentence = await prisma.sentence.update({
      where: { id },
      data: { formatting },
    });

    return NextResponse.json(sentence);
  } catch (error: any) {
    console.error("Sentence update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
