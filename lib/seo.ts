// Use one production origin for all search-engine metadata, including previews.
export const SITE_URL = (process.env.SEO_SITE_URL || "https://df-store-py-dfstore.vercel.app").replace(/\/+$/, "");
export const SITE_DESCRIPTION = "Comprá ropa, herramientas, electrónica y productos para el hogar en Paraguay. Delivery en Asunción y Central y envíos al interior.";
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
