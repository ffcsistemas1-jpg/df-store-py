import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BMJwuhLSjaA7mDADl2FbghgOsp8GGQXazp9zKI17Mf4ug6oyNlyM-hhENcsQrmoZN8FgKYxFP4dOntqFNhjnI1g";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  const s = supabaseAdmin();
  if (!s) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  // Keep webhook and VAPID private keys in Supabase Vault, not in source code
  // or a hard-coded trigger header.
  const { data: runtimeConfig, error: configError } =
    await s.rpc("get_push_runtime_config");
  if (configError || !runtimeConfig?.webhookSecret || !runtimeConfig?.vapidPrivateKey) {
    return NextResponse.json({ error: "push_runtime_not_configured" }, { status: 500 });
  }

  const suppliedSecret = req.headers.get("x-webhook-secret") || "";
  if (suppliedSecret.length < 32 || suppliedSecret !== runtimeConfig.webhookSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    webpush.setVapidDetails(
      "mailto:soporte@dfstorepy.com",
      VAPID_PUBLIC_KEY,
      String(runtimeConfig.vapidPrivateKey)
    );
  } catch {
    return NextResponse.json({ error: "vapid_invalid" }, { status: 500 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const order = body?.record || body?.order || null;

  const [{ data: subs, error: subsError }, { count: pendingCount, error: countError }] =
    await Promise.all([
      s.from("push_subscriptions").select("id,endpoint,p256dh,auth"),
      s.from("orders")
        .select("id", { count: "exact", head: true })
        .eq("is_test", false)
        .in("status", ["nuevo", "esperando_comprobante", "pendiente", "confirmado", "preparando", "enviado"]),
    ]);

  if (subsError || countError) {
    return NextResponse.json({ error: "push_data_lookup_failed" }, { status: 500 });
  }
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0, failed: 0 });

  const total = order?.total !== undefined && order?.total !== null
    ? `₲ ${Number(order.total).toLocaleString("es-PY")}`
    : "";
  const payload = JSON.stringify({
    title: "🛒 Nuevo pedido en DF Store PY",
    body: total ? `Pedido nuevo por ${total}` : "Entró un pedido nuevo a la tienda.",
    url: order?.id ? `/admin/pedidos/${order.id}` : "/admin/pedidos",
    tag: `pedido-${order?.id || "nuevo"}`,
    badgeCount: pendingCount || 1,
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await s.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, sent, failed });
}
