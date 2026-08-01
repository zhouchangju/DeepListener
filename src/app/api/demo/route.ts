import { NextResponse } from "next/server";
import { seedDemoTrack, removeDemoTracks, demoTrackExists } from "@/lib/demo-seed";
import { internalServerError } from "@/lib/api-response";

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
  const exists = await demoTrackExists();
  return NextResponse.json({ demoSeeded: exists });
}

export async function POST() {
  try {
    const result = await seedDemoTrack();
    return NextResponse.json({ ...result, demoSeeded: true });
  } catch (error) {
    console.error("Demo seed error:", error);
    return internalServerError();
  }
}

export async function DELETE() {
  try {
    const result = await removeDemoTracks();
    return NextResponse.json({ ...result, demoSeeded: false });
  } catch (error) {
    console.error("Demo remove error:", error);
    return internalServerError();
  }
}
