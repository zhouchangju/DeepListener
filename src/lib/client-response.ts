export async function requireOkResponse(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) {
    return;
  }

  let message = fallbackMessage;
  try {
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string" &&
      payload.error.trim()
    ) {
      message = payload.error;
    }
  } catch {
    // Keep the fallback for non-JSON responses.
  }

  throw new Error(message);
}
