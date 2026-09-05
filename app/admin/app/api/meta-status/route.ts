import { NextResponse } from "next/server";

export async function GET() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  const hasToken = Boolean(process.env.META_CAPI_ACCESS_TOKEN);
  const adAccount = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
  const marketingToken = Boolean(process.env.META_MARKETING_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN);
  return NextResponse.json({
    pixelConfigured: Boolean(pixelId),
    pixelIdMasked: pixelId ? `${pixelId.slice(0, 4)}••••${pixelId.slice(-4)}` : null,
    capiConfigured: hasToken,
    marketingConfigured: Boolean(adAccount && marketingToken),
    adAccountMasked: adAccount ? `••••${adAccount.slice(-6)}` : null,
    businessId: process.env.META_BUSINESS_ID || "474567029080550",
  });
}
