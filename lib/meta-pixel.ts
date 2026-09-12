"use client";

// Envoltorio para el Meta Pixel (navegador) + Conversions API (servidor).
// Los pedidos creados desde checkout no se reportan como Purchase hasta que
// exista una confirmación real desde administración. Esto evita contaminar
// las métricas de Meta con pruebas, pedidos pendientes o abandonos.

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

export type PixelEvent =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

export function newEventId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Purchase queda bloqueado en el navegador mientras el pedido esté solamente
 * creado/pendiente. Se conserva la firma para no romper el checkout existente.
 * Los eventos de navegación y embudo siguen funcionando normalmente.
 */
export function pixelTrack(event: PixelEvent, params?: Record<string, any>, eventId?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    const safeEvent = event === "Purchase" ? "Lead" : event;
    if (eventId) window.fbq("track", safeEvent, params || {}, { eventID: eventId });
    else window.fbq("track", safeEvent, params || {});
  } catch {
    // Nunca dejar que un error de tracking rompa la compra.
  }
}

// ---------- Atribución (UTM + fbclid) ----------
const ATTR_KEY = "df_attr_v1";

export type Attribution = {
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
  utm_content?: string; utm_term?: string; fbclid?: string;
  landing_page?: string;
};

export function captureAttribution() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming: Attribution = {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
      utm_term: params.get("utm_term") || undefined,
      fbclid: params.get("fbclid") || undefined,
    };
    const hasIncoming = Object.values(incoming).some(Boolean);
    const existingRaw = window.localStorage.getItem(ATTR_KEY);
    if (!existingRaw && hasIncoming) {
      window.localStorage.setItem(ATTR_KEY, JSON.stringify({ ...incoming, landing_page: window.location.pathname }));
    } else if (!existingRaw) {
      window.localStorage.setItem(ATTR_KEY, JSON.stringify({ landing_page: window.location.pathname }));
    }
  } catch {}
}

function getCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getAttribution(): Attribution & { fbp?: string; fbc?: string } {
  let stored: Attribution = {};
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(ATTR_KEY);
      if (raw) stored = JSON.parse(raw);
    }
  } catch {}
  return { ...stored, fbp: getCookie("_fbp"), fbc: getCookie("_fbc") };
}

// ---------- Conversions API (servidor) ----------
// Por seguridad, un pedido recién creado no se envía como Purchase. Se envía
// como Lead hasta que administración implemente la confirmación de pago/venta.
export async function sendCapiEvent(params: {
  event_name: PixelEvent;
  event_id: string;
  order_id?: string;
  value?: number;
  currency?: string;
  content_ids?: string[];
  num_items?: number;
  email?: string;
  phone?: string;
}) {
  try {
    const attribution = getAttribution();
    const safeEventName = params.event_name === "Purchase" ? "Lead" : params.event_name;
    await fetch("/api/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        event_name: safeEventName,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        fbp: attribution.fbp,
        fbc: attribution.fbc,
      }),
      keepalive: true,
    });
  } catch {
    // Best-effort: si falla, el Pixel del navegador ya mandó el evento igual.
  }
}
