import { NextRequest, NextResponse } from "next/server";
import { cancelImportJob } from "@/lib/import-jobs/cleanup";
import { readManifest, toPublicImportJob } from "@/lib/import-jobs/manifest";
import { ImportJobError } from "@/lib/import-jobs/run";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const manifest = await readManifest(id);
    if (!manifest) return NextResponse.json({ error: "Import operation was not found." }, { status: 404 });
    return NextResponse.json({ job: toPublicImportJob(manifest) });
  } catch {
    console.error("Import job status error");
    return NextResponse.json({ error: "Unable to read import recovery state." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== true) return NextResponse.json({ error: "Confirmation is required to remove this failed import." }, { status: 400 });
    const job = await cancelImportJob(id);
    return NextResponse.json({ job });
  } catch (error) {
    const safe = error instanceof ImportJobError ? error.message : "Unable to remove this import.";
    const status = error instanceof ImportJobError && /not found/i.test(error.message) ? 404 : 409;
    return NextResponse.json({ error: safe }, { status });
  }
}
