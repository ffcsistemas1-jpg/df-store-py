import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const orderId = String(body?.order_id || "").trim();
  if (!orderId) return NextResponse.json({ error: "order_id_required" }, { status: 400 });

  const { data: order, error: orderError } = await s
    .from("orders")
    .select("id,total,created_at,event_id,fbp,fbc,utm_source,utm_campaign,utm_content")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  if (String(body?.confirm || "") !== "yes") return NextResponse.json({ error: "confirmation_required" }, { status: 400 });

  let eventId = String(order.event_id || "").trim();
  if (!eventId) {
    eventId = crypto.randomUUID();
    const { error } = await s.from("orders").update({ event_id: eventId }).eq("id", orderId);
    if (error) return NextResponse.json({ error: "No se pudo asignar el event_id al pedido." }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey) return NextResponse.json({ error: "meta_not_configured" }, { status: 500 });

  const response = await fetch(`${supabaseUrl}/functions/v1/meta-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: publishableKey },
    body: JSON.stringify({
      action: "capi",
      event_name: "Purchase",
      event_id: eventId,
      order_id: orderId,
      event_time: Math.floor(new Date(order.created_at).getTime() / 1000),
      value: Number(order.total || 0),
      currency: "PYG",
      content_type: "product",
      fbp: order.fbp || undefined,
      fbc: order.fbc || undefined,
      custom_data: { currency: "PYG", value: Number(order.total || 0) },
      event_source_url: "https://df-store-py-dfstore.vercel.app/",
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({ status: "invalid_edge_response" }));
  return NextResponse.json(result, { status: response.status });
}
