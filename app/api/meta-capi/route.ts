import { NextRequest, NextResponse } from "next/server";

const ALLOWED_EVENTS = new Set(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]);
const MAX_BODY_BYTES = 32000;

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "body_too_large" }, { status: 413 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const eventName = String(body?.event_name || "");
  const eventId = String(body?.event_id || "").trim();
  const orderId = body?.order_id ? String(body.order_id) : undefined;
  if (!ALLOWED_EVENTS.has(eventName) || eventId.length < 8 || eventId.length > 128) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }
  if (eventName === "Purchase" && !orderId) {
    return NextResponse.json({ error: "purchase_requires_order_id" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ status: "not_configured" });
  }

  const forwardBody = {
    action: "capi",
    ...body,
    event_name: eventName,
    event_id: eventId,
    order_id: orderId,
    client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    client_user_agent: req.headers.get("user-agent") || undefined,
  };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/meta-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: publishableKey },
      body: JSON.stringify(forwardBody),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ status: "invalid_edge_response" }));
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ status: "network_error" }, { status: 502 });
  }
}
