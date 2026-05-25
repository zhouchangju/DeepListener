import { NextResponse } from "next/server";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function badRequest(error: string) {
  return jsonError(error, 400);
}

export function notFound(error: string) {
  return jsonError(error, 404);
}

export function internalServerError() {
  return jsonError("Internal server error", 500);
}
