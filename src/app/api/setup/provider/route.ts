import { NextRequest, NextResponse } from "next/server";
import { formatZodError, providerConfigSchema } from "@/lib/api-schemas";
import { badRequest, internalServerError } from "@/lib/api-response";
import { getProviderSummary, saveProviderConfig } from "@/lib/secrets-store";

/** Returns a masked summary of the transcription provider state. */
export async function GET() {
  try {
    return NextResponse.json(getProviderSummary());
  } catch (error: unknown) {
    console.error("Provider summary error:", error);
    return internalServerError();
  }
}

/** Persists the selected provider's key + optional baseUrl, updates env. */
export async function POST(req: NextRequest) {
  try {
    const parsed = providerConfigSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const { provider, apiKey, baseUrl } = parsed.data;
    await saveProviderConfig({ provider, apiKey, baseUrl });

    return NextResponse.json(getProviderSummary());
  } catch (error: unknown) {
    console.error("Provider config save error:", error);
    return internalServerError();
  }
}
