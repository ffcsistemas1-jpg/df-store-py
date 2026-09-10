import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const DEFAULT_BUSINESS_ID = "845353691984059";
const DEFAULT_PAGE_NAME = "FFC Electronic";

async function adminClient() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { s, ok: false as const, status: 401 };
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return { s, ok: false as const, status: 403 };
  return { s, ok: true as const };
}

export async function GET() {
  const a = await adminClient();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "unauthorized" : "forbidden" }, { status: a.status });

  const [{ data, error }, { data: secretStatus }] = await Promise.all([
    a.s.from("store_settings").select("meta_ad_account_id,meta_page_name,meta_page_id,meta_business_id,meta_pixel_id").eq("id", 1).maybeSingle(),
    a.s.rpc("get_meta_secret_status"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const adAccountId = String(data?.meta_ad_account_id || "").replace(/^act_/, "");
  return NextResponse.json({
    configured: true,
    adAccountId,
    pageName: data?.meta_page_name || DEFAULT_PAGE_NAME,
    pageId: data?.meta_page_id || "",
    businessId: data?.meta_business_id || DEFAULT_BUSINESS_ID,
    pixelId: data?.meta_pixel_id || "",
    capiConfigured: Boolean(secretStatus?.capiConfigured),
    marketingConfigured: Boolean(secretStatus?.marketingConfigured),
    capiLast4: secretStatus?.capiLast4 || null,
    marketingLast4: secretStatus?.marketingLast4 || null,
  });
}

export async function PUT(req: Request) {
  const a = await adminClient();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "unauthorized" : "forbidden" }, { status: a.status });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const adAccountId = String(body?.adAccountId || "").replace(/^act_/, "").replace(/[^0-9]/g, "");
  const pageName = String(body?.pageName || DEFAULT_PAGE_NAME).trim().slice(0, 120);
  const pageId = String(body?.pageId || "").replace(/[^0-9]/g, "").slice(0, 40);
  const businessId = String(body?.businessId || DEFAULT_BUSINESS_ID).replace(/[^0-9]/g, "").slice(0, 40);
  const pixelId = String(body?.pixelId || "").replace(/[^0-9]/g, "").slice(0, 40);

  if (!/^\d{10,20}$/.test(adAccountId)) return NextResponse.json({ error: "El ID de la cuenta publicitaria no es válido." }, { status: 400 });
  if (!pageName) return NextResponse.json({ error: "Indicá el nombre de la página." }, { status: 400 });
  if (!/^\d{10,20}$/.test(businessId)) return NextResponse.json({ error: "El ID del Business Portfolio no es válido." }, { status: 400 });
  if (!/^\d{10,20}$/.test(pixelId)) return NextResponse.json({ error: "El ID del Pixel no es válido." }, { status: 400 });

  const { error } = await a.s.from("store_settings").update({
    meta_ad_account_id: adAccountId,
    meta_page_name: pageName,
    meta_page_id: pageId || null,
    meta_business_id: businessId,
    meta_pixel_id: pixelId,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const [name, value] of [["meta_capi_access_token", body?.capiAccessToken], ["meta_marketing_access_token", body?.marketingAccessToken]] as const) {
    if (value !== undefined) {
      const { error: secretError } = await a.s.rpc("set_meta_runtime_secret", { p_name: name, p_value: String(value || "").trim() });
      if (secretError) return NextResponse.json({ error: "No se pudo guardar uno de los tokens de Meta." }, { status: 500 });
    }
  }

  const { data: secretStatus } = await a.s.rpc("get_meta_secret_status");
  return NextResponse.json({
    configured: true,
    adAccountId,
    pageName,
    pageId,
    businessId,
    pixelId,
    capiConfigured: Boolean(secretStatus?.capiConfigured),
    marketingConfigured: Boolean(secretStatus?.marketingConfigured),
    capiLast4: secretStatus?.capiLast4 || null,
    marketingLast4: secretStatus?.marketingLast4 || null,
  });
}
