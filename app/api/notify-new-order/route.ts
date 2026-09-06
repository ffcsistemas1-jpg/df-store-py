import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Esta ruta la llama un Database Webhook de Supabase cada vez que se
// inserta una fila nueva en "orders". Manda una notificación push a todos
// los administradores que activaron notificaciones en su teléfono/compu,
// y les actualiza el número en el ícono de la app instalada.

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (!process.env.ORDER_WEBHOOK_SECRET || secret !== process.env.ORDER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "vapid_not_configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:soporte@dfstorepy.com", vapidPublic, vapidPrivate);

  const s = supabaseAdmin();
  if (!s) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const order = body?.record || body?.order || null;

  const [{ data: subs }, { count: pendingCount }] = await Promise.all([
    s.from("push_subscriptions").select("id,endpoint,p256dh,auth"),
    s.from("orders").select("id", { count: "exact", head: true }).in("status", ["nuevo", "esperando_comprobante"]),
  ]);

  if (!subs || !subs.length) return NextResponse.json({ ok: true, sent: 0 });

  const total = order?.total ? `₲ ${Number(order.total).toLocaleString("es-PY")}` : "";
  const payload = JSON.stringify({
    title: "🛒 Nuevo pedido en DF Store PY",
    body: total ? `Pedido nuevo por ${total}` : "Entró un pedido nuevo a la tienda.",
    url: order?.id ? `/admin/pedidos/${order.id}` : "/admin/pedidos",
    tag: `pedido-${order?.id || "nuevo"}`,
    badgeCount: pendingCount || 1,
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await s.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}
