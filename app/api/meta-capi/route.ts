import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

// Conversions API de Meta — envío server-to-server, en paralelo al Pixel del
// navegador, con el mismo event_id para que Meta deduplique automáticamente.
//
// Variables de entorno necesarias (se configuran en Vercel, nunca públicas):
//   META_CAPI_ACCESS_TOKEN  -> token del sistema/usuario con permiso ads_management
//   NEXT_PUBLIC_META_PIXEL_ID -> mismo Pixel ID que usa el navegador
// Si falta cualquiera de las dos, el endpoint responde "not_configured" y
// no rompe nada: el checkout y el Pixel del navegador siguen funcionando.

const GRAPH_VERSION = "v21.0";

function sha256(value?: string) {
  if (!value) return undefined;
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function logEvent(payload: {
  event_id: string; event_name: string; order_id?: string;
  value?: number; currency?: string; status: string; response: any;
}) {
  const supabase = supabaseAnon();
  if (!supabase) return;
  try {
    await supabase.rpc("log_meta_event", {
      p_event_id: payload.event_id,
      p_event_name: payload.event_name,
      p_source: "capi",
      p_order_id: payload.order_id || null,
      p_value: payload.value ?? null,
      p_currency: payload.currency ?? null,
      p_status: payload.status,
      p_response: payload.response ?? null,
    });
  } catch {
    // Si falla el log, no afecta el envío del evento en sí.
  }
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const {
    event_name, event_id, order_id, value, currency,
    content_ids, num_items, email, phone,
    event_source_url, fbp, fbc,
  } = body || {};

  if (!event_name || !event_id) {
    return NextResponse.json({ error: "missing_event_name_or_id" }, { status: 400 });
  }

  if (!accessToken || !pixelId) {
    await logEvent({ event_id, event_name, order_id, value, currency, status: "not_configured", response: null });
    return NextResponse.json({ status: "not_configured" }, { status: 200 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") || undefined;

  const user_data: Record<string, any> = {
    client_ip_address: ip,
    client_user_agent: userAgent,
  };
  const hashedEmail = sha256(email);
  const hashedPhone = sha256(phone?.replace(/[^0-9]/g, ""));
  if (hashedEmail) user_data.em = [hashedEmail];
  if (hashedPhone) user_data.ph = [hashedPhone];
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;

  const eventPayload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        action_source: "website",
        event_source_url,
        user_data,
        custom_data: {
          currency: currency || "PYG",
          value: value ?? undefined,
          content_ids,
          num_items,
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      }
    );
    const data = await res.json();
    await logEvent({
      event_id, event_name, order_id, value, currency,
      status: res.ok ? "sent" : "error",
      response: data,
    });
    return NextResponse.json({ status: res.ok ? "sent" : "error", meta: data }, { status: res.ok ? 200 : 502 });
  } catch (err: any) {
    await logEvent({ event_id, event_name, order_id, value, currency, status: "network_error", response: String(err?.message || err) });
    return NextResponse.json({ status: "network_error" }, { status: 502 });
  }
}
