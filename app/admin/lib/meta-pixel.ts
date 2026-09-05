"use client";

// Envoltorio para el Meta Pixel (navegador) + Conversions API (servidor),
// con deduplicación por event_id. No hace nada si falta configuración
// (NEXT_PUBLIC_META_PIXEL_ID) — nunca rompe la tienda ni el checkout.

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

// Genera un event_id estable para deduplicar Pixel (navegador) y CAPI
// (servidor) del mismo evento. Meta descarta el duplicado automáticamente
// cuando ambos llegan con el mismo event_id.
export function newEventId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

export function pixelTrack(event: PixelEvent, params?: Record<string, any>, eventId?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    if (eventId) window.fbq("track", event, params || {}, { eventID: eventId });
    else window.fbq("track", event, params || {});
  } catch {
    // Nunca dejar que un error de tracking rompa la compra.
  }
}

// ---------- Atribución (UTM + fbclid) ----------
// Modelo "primer contacto": se guarda la primera vez que alguien entra desde
// un anuncio/link con parámetros, y se mantiene durante toda la sesión de
// compra aunque después navegue sin esos parámetros en la URL.
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
// Envía el mismo evento a nuestro backend, que lo reenvía a Meta con los
// datos hasheados. Se llama SIEMPRE junto con pixelTrack, con el mismo
// event_id, para que Meta deduplique Pixel + CAPI.
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
    await fetch("/api/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
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
