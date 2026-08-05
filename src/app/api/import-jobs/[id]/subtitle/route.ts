import { NextRequest, NextResponse } from "next/server";
import { attachImportSubtitle } from "@/lib/import-jobs/create";
import type { ImportUploadSource } from "@/lib/import-jobs/staging";
import { ImportJobError } from "@/lib/import-jobs/run";

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const encodedName = req.headers.get("x-deeplistener-file-name");
  const size = Number(req.headers.get("x-deeplistener-file-size"));
  if (!encodedName || !req.body || !Number.isSafeInteger(size) || size <= 0) {
    return NextResponse.json({ error: "Invalid subtitle upload metadata" }, { status: 400 });
  }
  let name: string;
  try {
    name = decodeURIComponent(encodedName);
  } catch {
    return NextResponse.json({ error: "Invalid subtitle file name" }, { status: 400 });
  }
  const source: ImportUploadSource = { name, type: req.headers.get("content-type") ?? undefined, size, stream: req.body };
  try {
    const job = await attachImportSubtitle(id, source);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof ImportJobError ? error.message : "Unable to attach this subtitle.";
    const status = error instanceof ImportJobError && /not found/i.test(error.message) ? 404 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
