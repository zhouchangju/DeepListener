import { NextRequest, NextResponse } from "next/server";
import {
  DESKTOP_LAUNCH_TOKEN_HEADER,
  desktopLaunchAuthEnabled,
  hasValidDesktopLaunchToken,
} from "@/lib/desktop-launch-auth";

/**
 * Desktop-only loopback authorization. The Electron main process injects the
 * header for its own origin; a local process that guesses the random port but
 * lacks this per-launch token receives a body-less 401.
 */
export function proxy(request: NextRequest) {
  if (!desktopLaunchAuthEnabled()) return NextResponse.next();

  const expected = process.env.DEEPLISTENER_LAUNCH_TOKEN;
  const candidate = request.headers.get(DESKTOP_LAUNCH_TOKEN_HEADER);
  if (hasValidDesktopLaunchToken(candidate, expected)) return NextResponse.next();

  return new NextResponse(null, {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const config = {
  matcher: ["/:path*"],
};
