import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GRAPH_VERSION = "v26.0";

function normalizeAccount(v: unknown) {
  return String(v || "").replace(/^act_/, "").replace(/[^0-9]/g, "");
}

function validDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function actionValue(list: unknown, matcher: RegExp) {
  return Array.isArray(list)
    ? list.filter((x: any) => matcher.test(String(x?.action_type || ""))).reduce((n: number, x: any) => n + Number(x?.value || 0), 0)
    : 0;
}

function dateParams(url: URL, period: string, startDate: string, endDate: string) {
  if (validDate(startDate) && validDate(endDate)) {
    if (startDate > endDate) throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    url.searchParams.set("time_range", JSON.stringify({ since: startDate, until: endDate }));
  } else {
    if (period === "1d") {
      url.searchParams.set("date_preset", "today");
    } else if (period === "7d" || period === "30d") {
      const now = new Date();
      const until = now.toISOString().slice(0, 10);
      const sinceDate = new Date(now);
      sinceDate.setUTCDate(sinceDate.getUTCDate() - (period === "7d" ? 6 : 29));
      const since = sinceDate.toISOString().slice(0, 10);
      url.searchParams.set("time_range", JSON.stringify({ since, until }));
    } else {
      url.searchParams.set("date_preset", "maximum");
    }
  }
}

async function metaGet(url: URL, token: string) {
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Meta Graph API rechazó la consulta.");
  }
  return data;
}

export async function GET(req: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: settings, error: settingsError } = await s
    .from("store_settings")
    .select("meta_ad_account_id")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) return NextResponse.json({ configured: false, connected: false, error: settingsError.message }, { status: 500 });

  const accountId = normalizeAccount(settings?.meta_ad_account_id);
  const params = new URL(req.url).searchParams;
  const period = params.get("period") || "1d";
  const startDate = params.get("startDate") || "";
  const endDate = params.get("endDate") || "";

  if (!accountId) {
    return NextResponse.json({ configured: false, connected: false, period, spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, reason: "missing_ad_account" });
  }

  // The Marketing API token is kept server-side in Supabase Vault.
  // Never use CAPI event data as a substitute for ad spend.
  const { data: marketingToken, error: tokenError } = await s.rpc("get_meta_runtime_secret", { p_name: "meta_marketing_access_token" });
  if (tokenError) {
    return NextResponse.json({ configured: false, connected: false, period, spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, reason: "marketing_secret_error" }, { status: 500 });
  }

  const token = String(marketingToken || "").trim();
  if (!token) {
    return NextResponse.json({ configured: false, connected: false, period, spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, reason: "marketing_api_not_configured" });
  }

  try {
    const base = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
    base.searchParams.set("fields", "spend,impressions,reach,frequency,clicks,ctr,cpm,cpc,actions,action_values,purchase_roas");
    base.searchParams.set("level", "account");
    dateParams(base, period, startDate, endDate);

    const account = await metaGet(base, token);
    const row = account?.data?.[0] || {};
    const purchases = actionValue(row.actions, /purchase/i);
    const purchaseValue = actionValue(row.action_values, /purchase/i);
    const spend = Number(row.spend || 0);

    const campaignsUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
    campaignsUrl.searchParams.set("fields", "campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,ctr,cpm,cpc,actions,action_values,purchase_roas");
    campaignsUrl.searchParams.set("level", "campaign");
    campaignsUrl.searchParams.set("limit", "200");
    dateParams(campaignsUrl, period, startDate, endDate);
    const campaignData = await metaGet(campaignsUrl, token).catch(() => ({ data: [] }));

    const campaigns = (campaignData?.data || []).map((c: any) => {
      const cp = Number(c.spend || 0);
      const cc = actionValue(c.actions, /purchase/i);
      const cv = actionValue(c.action_values, /purchase/i);
      return {
        id: String(c.campaign_id || ""),
        name: String(c.campaign_name || "Campaña"),
        spend: cp,
        impressions: Number(c.impressions || 0),
        reach: Number(c.reach || 0),
        clicks: Number(c.clicks || 0),
        ctr: Number(c.ctr || 0),
        cpm: Number(c.cpm || 0),
        cpc: Number(c.cpc || 0),
        frequency: Number(c.frequency || 0),
        purchases: cc,
        purchaseValue: cv,
        roas: cp > 0 ? cv / cp : 0,
      };
    });

    return NextResponse.json({
      configured: true,
      connected: true,
      period,
      startDate: validDate(startDate) ? startDate : null,
      endDate: validDate(endDate) ? endDate : null,
      spend,
      impressions: Number(row.impressions || 0),
      reach: Number(row.reach || 0),
      frequency: Number(row.frequency || 0),
      clicks: Number(row.clicks || 0),
      ctr: Number(row.ctr || 0),
      cpm: Number(row.cpm || 0),
      cpc: Number(row.cpc || 0),
      purchases,
      purchaseValue,
      costPerPurchase: purchases > 0 ? spend / purchases : 0,
      roas: spend > 0 ? purchaseValue / spend : 0,
      campaigns,
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({
      configured: true,
      connected: false,
      period,
      spend: 0,
      impressions: 0,
      clicks: 0,
      purchases: 0,
      purchaseValue: 0,
      error: e?.message || "No se pudo consultar Meta Marketing API.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
