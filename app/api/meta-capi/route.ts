import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const GRAPH_VERSION = "v26.0";
const ALLOWED_EVENTS = new Set(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]);
const MAX_BODY_BYTES = 32_000;

type MetaEventName = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

type PurchasePayload = {
  order_id: string;
  event_id: string;
  value: number;
  currency: string;
  content_ids: string[];
  num_items: number;
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  landing_page?: string | null;
};

function sha256(value?: string | null) {
  if (!value) return undefined;
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function supabaseServerRpc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function claimEvent(eventName: MetaEventName, eventId: string, orderId?: string) {
  const supabase = supabaseServerRpc();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("claim_meta_event", {
    p_event_name: eventName,
    p_event_id: eventId,
    p_order_id: orderId || null,
  });
  if (error) return false;
  return data === true;
}

async function getPurchasePayload(orderId: string, eventId: string): Promise<PurchasePayload | null> {
  const supabase = supabaseServerRpc();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_meta_purchase_payload", {
    p_order_id: orderId,
    p_event_id: eventId,
  });
  if (error || !data) return null;
  return data as PurchasePayload;
}

async function recordResult(payload: {
  event_id: string;
  event_name: MetaEventName;
  order_id?: string;
  value?: number;
  currency?: string;
  status: "sent" | "error" | "network_error" | "not_configured";
  response: unknown;
}) {
  const supabase = supabaseServerRpc();
  if (!supabase) return;
  try {
    await supabase.rpc("record_meta_event_result", {
      p_event_id: payload.event_id,
      p_event_name: payload.event_name,
      p_order_id: payload.order_id || null,
      p_value: payload.value ?? null,
      p_currency: payload.currency ?? null,
      p_status: payload.status,
      p_response: payload.response ?? null,
    });
  } catch {}
}

function cleanContentIds(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const ids = value.map(String).filter((x) => x.length > 0 && x.length <= 128).slice(0, 50);
  return ids.length ? ids : undefined;
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "body_too_large" }, { status: 413 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const eventName = String(body?.event_name || "") as MetaEventName;
  const eventId = String(body?.event_id || "").trim();
  const orderId = body?.order_id ? String(body.order_id) : undefined;

  if (!ALLOWED_EVENTS.has(eventName) || eventId.length < 8 || eventId.length > 128) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }
  if (eventName === "Purchase" && !orderId) {
    return NextResponse.json({ error: "purchase_requires_order_id" }, { status: 400 });
  }

  let value = Number.isFinite(Number(body?.value)) ? Math.max(0, Number(body.value)) : undefined;
  let currency = String(body?.currency || "PYG").slice(0, 8);
  let contentIds = cleanContentIds(body?.content_ids);
  let numItems = Number.isFinite(Number(body?.num_items)) ? Math.max(0, Math.floor(Number(body.num_items))) : undefined;
  let email = body?.email ? String(body.email) : undefined;
  let phone = body?.phone ? String(body.phone) : undefined;
  let fbp = body?.fbp ? String(body.fbp).slice(0, 255) : undefined;
  let fbc = body?.fbc ? String(body.fbc).slice(0, 255) : undefined;
  let eventSourceUrl = body?.event_source_url ? String(body.event_source_url).slice(0, 2048) : undefined;

  // Purchase nunca confía en importes/productos/PII enviados por el navegador.
  // La fuente de verdad es el pedido ya creado en Supabase, vinculado al mismo event_id.
  if (eventName === "Purchase") {
    const purchase = await getPurchasePayload(orderId!, eventId);
    if (!purchase) return NextResponse.json({ error: "purchase_order_not_found_or_event_mismatch" }, { status: 409 });
    value = Number(purchase.value);
    currency = purchase.currency || "PYG";
    contentIds = cleanContentIds(purchase.content_ids);
    numItems = Number(purchase.num_items || 0);
    email = purchase.email || undefined;
    phone = purchase.phone || undefined;
    fbp = purchase.fbp || undefined;
    fbc = purchase.fbc || undefined;
    if (!eventSourceUrl && purchase.landing_page) eventSourceUrl = purchase.landing_page;
  }

  const claimed = await claimEvent(eventName, eventId, orderId);
  if (!claimed) return NextResponse.json({ status: "duplicate_ignored" }, { status: 200 });

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!accessToken || !pixelId) {
    await recordResult({ event_id: eventId, event_name: eventName, order_id: orderId, value, currency, status: "not_configured", response: null });
    return NextResponse.json({ status: "not_configured" }, { status: 200 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") || undefined;
  const userData: Record<string, any> = { client_ip_address: ip, client_user_agent: userAgent };
  const hashedEmail = sha256(email);
  const hashedPhone = sha256(phone?.replace(/[^0-9]/g, ""));
  if (hashedEmail) userData.em = [hashedEmail];
  if (hashedPhone) userData.ph = [hashedPhone];
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const eventPayload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: eventSourceUrl,
      user_data: userData,
      custom_data: {
        currency: currency || "PYG",
        value,
        content_ids: contentIds,
        content_type: contentIds?.length ? "product" : undefined,
        num_items: numItems,
      },
    }],
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ error: "invalid_meta_response" }));
    const status = res.ok ? "sent" : "error";
    await recordResult({ event_id: eventId, event_name: eventName, order_id: orderId, value, currency, status, response: data });
    return NextResponse.json({ status, meta: data }, { status: res.ok ? 200 : 502 });
  } catch (err: any) {
    await recordResult({ event_id: eventId, event_name: eventName, order_id: orderId, value, currency, status: "network_error", response: String(err?.message || err) });
    return NextResponse.json({ status: "network_error" }, { status: 502 });
  }
}
