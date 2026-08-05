/**
 * Per-launch authorization shared by the Desktop service proxy and tests.
 *
 * The check is deliberately opt-in. Server/dev layouts do not set the
 * enable flag, so adding this module cannot accidentally lock ordinary local
 * development or self-hosted deployments.
 */
export const DESKTOP_LAUNCH_TOKEN_HEADER = "x-deeplistener-launch-token";

export function desktopLaunchAuthEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env.DEEPLISTENER_REQUIRE_LAUNCH_TOKEN === "1" &&
    Boolean(env.DEEPLISTENER_LAUNCH_TOKEN?.trim());
}

/**
 * Compare the request token without an early exit on the shared prefix.
 * Length differences remain part of the accumulated result, while the loop
 * still walks the complete longer value. The token is high-entropy and is
 * never included in errors, responses, logs, or URLs.
 */
export function hasValidDesktopLaunchToken(
  candidate: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!candidate || !expected) return false;
  const maxLength = Math.max(candidate.length, expected.length);
  let difference = candidate.length ^ expected.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (candidate.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}
