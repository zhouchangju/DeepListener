import { NextRequest, NextResponse } from "next/server";
import { createImportJob } from "@/lib/import-jobs/create";
import { listManifests, toPublicImportJob } from "@/lib/import-jobs/manifest";
import { toPublicUploadError } from "@/lib/upload-error";
import type { ImportUploadSource } from "@/lib/import-jobs/staging";

export const maxDuration = 900;

export async function GET() {
  try {
    const manifests = await listManifests();
    return NextResponse.json({ jobs: manifests.map(toPublicImportJob) });
  } catch {
    console.error("Import job list error");
    return NextResponse.json({ error: "Unable to read import recovery state." }, { status: 500 });
  }
}

/** Receive one media stream into operation-owned staging. */
export async function POST(req: NextRequest) {
  const encodedName = req.headers.get("x-deeplistener-file-name");
  const size = Number(req.headers.get("x-deeplistener-file-size"));
  if (!encodedName || !req.body || !Number.isSafeInteger(size) || size <= 0) {
    return NextResponse.json({ error: "Invalid media upload metadata" }, { status: 400 });
  }
  let name: string;
  try {
    name = decodeURIComponent(encodedName);
  } catch {
    return NextResponse.json({ error: "Invalid media file name" }, { status: 400 });
  }
  const source: ImportUploadSource = {
    name,
    type: req.headers.get("content-type") ?? undefined,
    size,
    stream: req.body,
  };
  try {
    const job = await createImportJob(source);
    return NextResponse.json({ operationId: job.id, job }, { status: 201 });
  } catch (error) {
    const safe = toPublicUploadError(error);
    console.error("Import job create error:", safe.code ?? "UNKNOWN");
    return NextResponse.json({ error: safe.message, ...(safe.code ? { code: safe.code } : {}) }, { status: safe.status });
  }
}
