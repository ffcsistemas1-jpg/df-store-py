import { NextResponse } from "next/server";

// Devuelve solo si la configuración de Meta existe o no — nunca el valor
// real del token. Lo consume la página Admin → Meta Ads.
export async function GET() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  const hasToken = Boolean(process.env.META_CAPI_ACCESS_TOKEN);
  return NextResponse.json({
    pixelConfigured: Boolean(pixelId),
    pixelIdMasked: pixelId ? `${pixelId.slice(0, 4)}••••${pixelId.slice(-4)}` : null,
    capiConfigured: hasToken,
  });
}
