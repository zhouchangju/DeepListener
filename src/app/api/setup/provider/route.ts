import { NextRequest, NextResponse } from "next/server";
import { formatZodError, providerConfigSchema, providerRemovalSchema } from "@/lib/api-schemas";
import { badRequest, internalServerError } from "@/lib/api-response";
import { getProviderSummaryAsync, removeProviderConfig, saveProviderConfig } from "@/lib/secrets-store";

/** Returns a masked summary of the transcription provider state. */
export async function GET() {
  try {
    return NextResponse.json(await getProviderSummaryAsync());
  } catch {
    console.error("Provider summary error");
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

    return NextResponse.json(await getProviderSummaryAsync());
  } catch {
    console.error("Provider config save error");
    return internalServerError();
  }
}

/** Removes one locally stored provider credential after explicit UI confirmation. */
export async function DELETE(req: NextRequest) {
  try {
    const parsed = providerRemovalSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    await removeProviderConfig(parsed.data.provider);
    return NextResponse.json(await getProviderSummaryAsync());
  } catch {
    console.error("Provider config removal error");
    return internalServerError();
  }
}
