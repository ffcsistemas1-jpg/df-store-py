import { createClient } from "./supabase/browser";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer;
}

// Pide permiso de notificaciones al navegador y, si lo concede, se suscribe
// de verdad al servicio de Web Push y guarda la suscripción en Supabase para
// que el servidor le pueda mandar avisos de pedidos nuevos más adelante.
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, reason: "vapid_not_configured" };

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }
  const json = subscription.toJSON() as any;
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { ok: false, reason: "no_admin_session" };
  const { error } = await s.from("push_subscriptions").upsert(
    { admin_user_id: user.id, endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

// Consulta cuántos pedidos siguen sin gestionar y actualiza el número
// que se ve sobre el ícono de la app instalada (si el navegador lo soporta).
export async function refreshAppBadge(): Promise<number> {
  try {
    const s = createClient();
    const { count } = await s.from("orders").select("id", { count: "exact", head: true }).in("status", ["nuevo", "esperando_comprobante"]);
    const n = count || 0;
    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      if (n > 0) await (navigator as any).setAppBadge(n);
      else await (navigator as any).clearAppBadge();
    }
    return n;
  } catch { return 0; }
}
