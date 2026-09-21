import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function callMetaEdge(period: string, startDate?: string, endDate?: string, accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const body: Record<string, string> = { action: "insights", period };
    if (startDate && endDate) {
      body.startDate = startDate;
      body.endDate = endDate;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: key,
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch(`${url}/functions/v1/meta-api`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: { session } } = await s.auth.getSession();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: settings, error: settingsError } = await s
    .from("store_settings")
    .select("meta_ad_account_id")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json(
      { configured: false, connected: false, period: "1d", spend: 0, error: settingsError.message },
      { status: 500 }
    );
  }

  const accountId = String(settings?.meta_ad_account_id || "")
    .replace(/^act_/, "")
    .replace(/[^0-9]/g, "");

  const params = new URL(req.url).searchParams;
  const period = params.get("period") || "1d";
  const startDate = params.get("startDate") || "";
  const endDate = params.get("endDate") || "";

  if (!accountId) {
    return NextResponse.json({
      configured: false,
      connected: false,
      period,
      spend: 0,
      impressions: 0,
      clicks: 0,
      purchases: 0,
      purchaseValue: 0,
      reason: "missing_ad_account",
    });
  }

  const edge = await callMetaEdge(period, startDate, endDate, session?.access_token);

  if (edge && (edge.connected || edge.configured || edge.reason === "missing_ad_account_or_marketing_token")) {
    return NextResponse.json(edge, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({
    configured: false,
    connected: false,
    period,
    spend: 0,
    impressions: 0,
    clicks: 0,
    purchases: 0,
    purchaseValue: 0,
    reason: "marketing_api_unreachable",
    error: edge?.error || "No se pudo consultar el servicio de Meta Ads.",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
