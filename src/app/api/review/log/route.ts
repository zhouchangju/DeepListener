import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { reviewItemId } = await req.json();

    if (!reviewItemId) {
      return NextResponse.json({ error: "Missing reviewItemId" }, { status: 400 });
    }

    await prisma.reviewLog.create({
      data: { reviewItemId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
