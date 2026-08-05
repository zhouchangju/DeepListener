export function validateReusedStandalone({ alpha, manifest }) {
  const expectedChannel = alpha ? "internal-alpha" : "public";
  const expectedFallback = alpha;
  if (
    manifest?.schemaVersion !== 1
    || manifest?.releaseChannel !== expectedChannel
    || manifest?.build?.systemFfmpegFallback !== expectedFallback
  ) {
    return {
      ok: false,
      reason: `cached standalone does not match the requested ${expectedChannel} release channel`,
    };
  }
  return { ok: true };
}
