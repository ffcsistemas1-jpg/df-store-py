import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const GRAPH_VERSION = "v26.0";
type MetaRow = { action_type?: string; value?: string | number };
function actionValue(list: unknown, matcher: RegExp) {
  if (!Array.isArray(list)) return 0;
  return (list as MetaRow[]).filter(x => matcher.test(String(x?.action_type || ""))).reduce((n, x) => n + Number(x?.value || 0), 0);
}
async function callMetaEdge(period: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/functions/v1/meta-api`, { method: "POST", headers: { "Content-Type": "application/json", apikey: key }, body: JSON.stringify({ action: "insights", period }), cache: "no-store" });
    return await res.json();
  } catch { return null; }
}
export async function GET(req: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data: settings } = await s.from("store_settings").select("meta_ad_account_id").eq("id", 1).maybeSingle();
  const accountId = String(settings?.meta_ad_account_id || "").replace(/^act_/, "").replace(/[^0-9]/g, "");
  const period = new URL(req.url).searchParams.get("period") || "1d";
  const edge = await callMetaEdge(period);
  if (edge?.connected || edge?.configured || edge?.reason === "missing_ad_account_or_marketing_token") return NextResponse.json(edge);
  if (!accountId) return NextResponse.json({ configured: false, connected: false, period, spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, reason: "missing_ad_account" });
  return NextResponse.json({ configured: false, connected: false, period, spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, reason: "marketing_api_not_configured" });
}
