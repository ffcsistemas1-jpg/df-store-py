import type { MetadataRoute } from "next";
import { getProducts } from "../lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://df-store-py-dfstore.vercel.app";
  const products = await getProducts();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalogo`, changeFrequency: "daily", priority: 0.9 },
  ];
  const productEntries: MetadataRoute.Sitemap = products
    .filter((p) => !p.id.startsWith("demo-"))
    .map((p) => ({ url: `${base}/catalogo/${p.id}`, changeFrequency: "weekly", priority: 0.7 }));
  return [...staticEntries, ...productEntries];
}
