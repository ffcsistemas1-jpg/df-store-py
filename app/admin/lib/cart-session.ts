"use client";
// Identificador de carrito anónimo, guardado en una cookie (no en localStorage).
// Solo es un puntero: los datos reales del carrito (productos y cantidades) viven en Supabase.
const COOKIE = "df_cart";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 días

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "cart-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

export function getCartSession(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  const id = uuid();
  document.cookie = `${COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
  return id;
}
