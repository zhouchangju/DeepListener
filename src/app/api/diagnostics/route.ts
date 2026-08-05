import { collectDiagnostics, serializeDiagnostics } from "@/lib/diagnostics";

/**
 * User-triggered diagnostics export. The service returns an allow-listed JSON
 * snapshot; it never serializes Prisma rows, media bytes, or secret values.
 */
export async function GET() {
  try {
    const snapshot = await collectDiagnostics();
    return new Response(serializeDiagnostics(snapshot), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="deeplistener-diagnostics.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Diagnostics unavailable" }, { status: 500 });
  }
}
