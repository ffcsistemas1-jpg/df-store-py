import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://df-store-py-dfstore.vercel.app";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/carrito", "/checkout"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
