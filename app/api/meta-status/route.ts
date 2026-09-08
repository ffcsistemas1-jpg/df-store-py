import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  const hasToken = Boolean(process.env.META_CAPI_ACCESS_TOKEN);
  const { data: settings } = await s.from("store_settings")
    .select("meta_ad_account_id,meta_page_name,meta_page_id").eq("id", 1).maybeSingle();

  const adAccount = String(settings?.meta_ad_account_id || process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
  const marketingToken = Boolean(process.env.META_MARKETING_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN);

  return NextResponse.json({
    pixelConfigured: Boolean(pixelId),
    pixelIdMasked: pixelId ? `${pixelId.slice(0, 4)}••••${pixelId.slice(-4)}` : null,
    capiConfigured: hasToken,
    marketingConfigured: Boolean(adAccount && marketingToken),
    adAccountMasked: adAccount ? `••••${adAccount.slice(-6)}` : null,
    adAccountId: adAccount || null,
    pageName: settings?.meta_page_name || process.env.META_PAGE_NAME || "FFC Electronic",
    pageId: settings?.meta_page_id || process.env.META_PAGE_ID || null,
    businessId: process.env.META_BUSINESS_ID || "474567029080550",
  });
}
