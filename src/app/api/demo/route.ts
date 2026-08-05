import { NextResponse } from "next/server";
import { seedDemoTrack, removeDemoTracks, demoTrackExists } from "@/lib/demo-seed";
import { evaluateDatabaseReadiness } from "@/lib/setup-readiness";
import { internalServerError } from "@/lib/api-response";

const DATABASE_NOT_READY_MESSAGE = "Local learning data is not ready. Open Setup to review the checks.";

async function databaseReadyOrResponse(): Promise<NextResponse | null> {
  try {
    const check = await evaluateDatabaseReadiness();
    if (check.status === "ready") return null;
  } catch {
    // A malformed runtime root is the same learner-facing recovery state as
    // a missing database. Keep the response bounded and path-free.
  }
  return NextResponse.json(
    { error: DATABASE_NOT_READY_MESSAGE, code: "DATABASE_NOT_READY" },
    { status: 503 },
  );
}

/**
 * Demo management route (W3 T190/T192, DFS-001/002/004).
 *
 * - GET  → whether the demo track currently exists
 * - POST → seed the demo track (idempotent)
 * - DELETE → remove demo-owned records only (personal data untouched)
 *
 * No provider key is required; the demo uses bundled audio + timeline.
 */
export async function GET() {
  const blocked = await databaseReadyOrResponse();
  if (blocked) return blocked;
  const exists = await demoTrackExists();
  return NextResponse.json({ demoSeeded: exists });
}

export async function POST() {
  try {
    const blocked = await databaseReadyOrResponse();
    if (blocked) return blocked;
    const result = await seedDemoTrack();
    return NextResponse.json({ ...result, demoSeeded: true });
  } catch {
    console.error("Demo seed error");
    return internalServerError();
  }
}

export async function DELETE() {
  try {
    const blocked = await databaseReadyOrResponse();
    if (blocked) return blocked;
    const result = await removeDemoTracks();
    return NextResponse.json({ ...result, demoSeeded: false });
  } catch {
    console.error("Demo remove error");
    return internalServerError();
  }
}
