import { withSupabase } from "npm:@supabase/server@^1";

const GRAPH_VERSION = "v26.0";
const ALLOWED_EVENTS = new Set(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]);

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function getSecret(supabaseAdmin: any, name: string) {
  const { data, error } = await supabaseAdmin.rpc("get_meta_runtime_secret", { p_name: name });
  if (error) throw new Error(`secret_error:${name}`);
  return String(data || "").trim();
}

function normalizeAccount(value: unknown) {
  return String(value || "").replace(/^act_/, "").replace(/[^0-9]/g, "");
}

async function sendCapi(supabaseAdmin: any, body: any) {
  const eventName = String(body?.event_name || "");
  const eventId = String(body?.event_id || "").trim();
  if (!ALLOWED_EVENTS.has(eventName) || eventId.length < 8 || eventId.length > 128) return json({ status: "invalid_event" }, 400);

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("store_settings")
    .select("meta_pixel_id")
    .eq("id", 1)
    .maybeSingle();
  if (settingsError) return json({ status: "config_error" }, 500);

  const pixelId = String(settings?.meta_pixel_id || "").trim();
  const token = await getSecret(supabaseAdmin, "meta_capi_access_token");
  if (!pixelId || !token) return json({ status: "not_configured" });

  const eventPayload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: body?.event_source_url ? String(body.event_source_url).slice(0, 2048) : undefined,
      user_data: body?.user_data || {},
      custom_data: body?.custom_data || {},
    }],
  };

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventPayload),
  });
  const meta = await res.json().catch(() => ({ error: "invalid_meta_response" }));
  return json({ status: res.ok ? "sent" : "error", meta }, res.ok ? 200 : 502);
}

async function getInsights(supabaseAdmin: any, body: any) {
  const { data: settings, error } = await supabaseAdmin
    .from("store_settings")
    .select("meta_ad_account_id")
    .eq("id", 1)
    .maybeSingle();
  if (error) return json({ configured: false, connected: false, error: error.message }, 500);

  const accountId = normalizeAccount(settings?.meta_ad_account_id);
  const token = await getSecret(supabaseAdmin, "meta_marketing_access_token");
  const fallback = token || await getSecret(supabaseAdmin, "meta_capi_access_token");
  const period = String(body?.period || "30d");
  const datePreset = period === "7d" ? "last_7d" : period === "all" ? "maximum" : "last_30d";
  if (!accountId || !fallback) return json({ configured: false, connected: false, reason: "missing_ad_account_or_marketing_token" });

  const fields = "spend,impressions,clicks,actions,action_values,purchase_roas";
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("level", "account");
  url.searchParams.set("access_token", fallback);

  const res = await fetch(url, { cache: "no-store" });
  const jsonData = await res.json().catch(() => ({}));
  if (!res.ok) return json({ configured: true, connected: false, error: jsonData?.error?.message || "Meta API error" }, 502);

  const row = jsonData?.data?.[0] || {};
  const actionValue = (list: unknown, matcher: RegExp) => Array.isArray(list)
    ? list.filter((x: any) => matcher.test(String(x?.action_type || ""))).reduce((n: number, x: any) => n + Number(x?.value || 0), 0)
    : 0;
  const purchases = actionValue(row.actions, /purchase/i);
  const purchaseValue = actionValue(row.action_values, /purchase/i);
  const spend = Number(row.spend || 0);
  return json({
    configured: true,
    connected: true,
    period,
    spend,
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    purchases,
    purchaseValue,
    costPerPurchase: purchases > 0 ? spend / purchases : 0,
    roas: spend > 0 ? purchaseValue / spend : 0,
  });
}

async function saveSecrets(supabase: any, supabaseAdmin: any, body: any) {
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) return json({ error: "forbidden" }, 403);

  for (const [key, value] of [["meta_capi_access_token", body?.capiAccessToken], ["meta_marketing_access_token", body?.marketingAccessToken]] as const) {
    if (value !== undefined) {
      const { error } = await supabase.rpc("set_meta_runtime_secret", { p_name: key, p_value: String(value || "").trim() });
      if (error) return json({ error: "No se pudo guardar uno de los tokens de Meta." }, 500);
    }
  }
  return json({ ok: true });
}

export default {
  fetch: withSupabase({ auth: ["user", "publishable"] }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }

    try {
      const action = String(body?.action || "");
      if (action === "save_secrets") return saveSecrets(ctx.supabase, ctx.supabaseAdmin, body);
      if (action === "capi") return sendCapi(ctx.supabaseAdmin, body);
      if (action === "insights") return getInsights(ctx.supabaseAdmin, body);
      return json({ error: "unknown_action" }, 400);
    } catch (e) {
      console.error(e);
      return json({ error: "meta_runtime_error" }, 500);
    }
  }),
};
