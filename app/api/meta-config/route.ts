import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const DEFAULT_BUSINESS_ID = process.env.META_BUSINESS_ID || "474567029080550";
const DEFAULT_PAGE_NAME = process.env.META_PAGE_NAME || "FFC Electronic";

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

  const { data, error } = await a.s.from("store_settings")
    .select("meta_ad_account_id,meta_page_name,meta_page_id")
    .eq("id", 1).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const adAccountId = String(data?.meta_ad_account_id || process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
  return NextResponse.json({
    configured: true,
    adAccountId,
    pageName: data?.meta_page_name || DEFAULT_PAGE_NAME,
    pageId: data?.meta_page_id || process.env.META_PAGE_ID || "",
    businessId: DEFAULT_BUSINESS_ID,
  });
}

export async function PUT(req: Request) {
  const a = await adminClient();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "unauthorized" : "forbidden" }, { status: a.status });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const adAccountId = String(body?.adAccountId || "").replace(/^act_/, "").replace(/[^0-9]/g, "");
  const pageName = String(body?.pageName || "").trim().slice(0, 120);
  const pageId = String(body?.pageId || "").replace(/[^0-9]/g, "").slice(0, 40);

  if (!/^\d{10,20}$/.test(adAccountId)) {
    return NextResponse.json({ error: "El ID de la cuenta publicitaria no es válido." }, { status: 400 });
  }
  if (!pageName) return NextResponse.json({ error: "Indicá el nombre de la página." }, { status: 400 });

  const { error } = await a.s.from("store_settings").update({
    meta_ad_account_id: adAccountId,
    meta_page_name: pageName,
    meta_page_id: pageId || null,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    configured: true,
    adAccountId,
    pageName,
    pageId,
    businessId: DEFAULT_BUSINESS_ID,
  });
}
