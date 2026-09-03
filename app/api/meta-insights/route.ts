import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const GRAPH_VERSION = "v26.0";

function actionValue(list: any[] | undefined, matcher: RegExp) {
  if (!Array.isArray(list)) return 0;
  return list.filter((x) => matcher.test(String(x?.action_type || ""))).reduce((n, x) => n + Number(x?.value || 0), 0);
}

export async function GET() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const accountRaw = process.env.META_AD_ACCOUNT_ID || "";
  const accountId = accountRaw.replace(/^act_/, "");
  const token = process.env.META_MARKETING_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || "";
  if (!accountId || !token) {
    return NextResponse.json({ configured: false, reason: "missing_ad_account_or_marketing_token" });
  }

  const fields = "spend,impressions,clicks,actions,action_values,purchase_roas";
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("date_preset", "last_7d");
  url.searchParams.set("level", "account");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) return NextResponse.json({ configured: true, connected: false, error: json?.error?.message || "Meta API error" }, { status: 502 });
    const row = json?.data?.[0] || {};
    const purchases = actionValue(row.actions, /purchase/i);
    const purchaseValue = actionValue(row.action_values, /purchase/i);
    const spend = Number(row.spend || 0);
    const roas = spend > 0 ? purchaseValue / spend : 0;
    return NextResponse.json({
      configured: true,
      connected: true,
      period: "last_7d",
      spend,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      purchases,
      purchaseValue,
      costPerPurchase: purchases > 0 ? spend / purchases : 0,
      roas,
    });
  } catch (e: any) {
    return NextResponse.json({ configured: true, connected: false, error: String(e?.message || e) }, { status: 502 });
  }
}
