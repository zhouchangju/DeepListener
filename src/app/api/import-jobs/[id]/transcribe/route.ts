import { NextRequest, NextResponse } from "next/server";
import { runImportJob, ImportJobError } from "@/lib/import-jobs/run";

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const provider = typeof body?.provider === "string" ? body.provider : undefined;
  try {
    const job = await runImportJob(id, provider);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof ImportJobError ? error.message : "Unable to process this import.";
    const status = error instanceof ImportJobError && /not found/i.test(error.message) ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
