import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [{ data: settings }, { data: secretStatus }] = await Promise.all([
    s.from("store_settings").select("meta_ad_account_id,meta_page_name,meta_page_id,meta_business_id,meta_pixel_id").eq("id", 1).maybeSingle(),
    s.rpc("get_meta_secret_status"),
  ]);

  const pixelId = String(settings?.meta_pixel_id || "").replace(/[^0-9]/g, "");
  const adAccount = String(settings?.meta_ad_account_id || "").replace(/^act_/, "").replace(/[^0-9]/g, "");
  const capiConfigured = Boolean(secretStatus?.capiConfigured || process.env.META_CAPI_ACCESS_TOKEN);
  const marketingConfigured = Boolean(secretStatus?.marketingConfigured || process.env.META_MARKETING_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN);

  return NextResponse.json({
    pixelConfigured: /^\d{10,20}$/.test(pixelId),
    pixelIdMasked: pixelId ? `${pixelId.slice(0, 4)}••••${pixelId.slice(-4)}` : null,
    capiConfigured,
    marketingConfigured: Boolean(adAccount && marketingConfigured),
    adAccountMasked: adAccount ? `••••${adAccount.slice(-6)}` : null,
    adAccountId: adAccount || null,
    pageName: settings?.meta_page_name || "FFC Electronic",
    pageId: settings?.meta_page_id || null,
    businessId: settings?.meta_business_id || "845353691984059",
  });
}
